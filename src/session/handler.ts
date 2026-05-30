import type {
  AgentChatRequest,
  AgentChatResponse,
  ConversationTurn,
  DebouncedMessageBatch,
} from "../types.js";
import { AGENT_ERROR_FALLBACK } from "../constants.js";
import { loadServerConfig } from "../config.js";
import { runAgentTurn } from "../agent.js";
import { classifyTask } from "../pipeline/classifier.js";
import type { ClassificationInput } from "../pipeline/classifier.js";
import { withRetry } from "../pipeline/retry.js";
import { sendAgentResponseToTelegram } from "../egress/telegram-sender.js";
import type { TelegramThread } from "../egress/telegram-sender.js";

export interface SessionState {
  lastInboundAtMs?: number;
  history: ConversationTurn[];
}

export type DeliveryTarget = { kind: "telegram"; thread: TelegramThread };

export interface SessionHandlerDeps {
  sessions: Map<string, SessionState>;
  deliveryTargets: Map<string, DeliveryTarget>;
}

async function deliverResponse(
  chatGuid: string,
  deliveryTargets: Map<string, DeliveryTarget>,
  response: AgentChatResponse
): Promise<void> {
  const target = deliveryTargets.get(chatGuid);
  if (!target) {
    console.warn("[server] No delivery target for chat", chatGuid);
    return;
  }

  await sendAgentResponseToTelegram(target.thread, response);
}

export function createBatchHandler(deps: SessionHandlerDeps) {
  const config = loadServerConfig();

  return async function handleBatch(batch: DebouncedMessageBatch): Promise<void> {
    const currentTime = Date.now();
    const state = deps.sessions.get(batch.chatGuid) ?? { history: [] };

    const classifierInput: ClassificationInput = {
      messageText: batch.text,
      nowMs: currentTime,
      followUpWindowMs: config.followUpWindowMs,
    };
    if (state.lastInboundAtMs !== undefined) {
      classifierInput.previousMessageAtMs = state.lastInboundAtMs;
    }
    const taskType = classifyTask(classifierInput);

    const request: AgentChatRequest = {
      chatGuid: batch.chatGuid,
      sender: batch.sender,
      ...(batch.senders && batch.senders.length > 1 ? { senders: batch.senders } : {}),
      message: batch.text,
      isGroupChat: batch.isGroupChat,
      taskType,
      attachments: batch.messages.flatMap((message) => message.attachments),
      conversationHistory: state.history.slice(-20),
    };

    state.lastInboundAtMs = currentTime;
    deps.sessions.set(batch.chatGuid, state);

    try {
      const response = await withRetry(
        config.agentMaxRetries + 1,
        config.agentRetryBaseMs,
        () => runAgentTurn(request)
      );

      state.history.push({
        role: "user",
        content: batch.text,
        timestamp: currentTime,
        sender: batch.sender,
      });

      const isSilent = response.silent === true || response.response.trim().length === 0;

      if (!isSilent) {
        await deliverResponse(batch.chatGuid, deps.deliveryTargets, response);

        state.history.push({
          role: "assistant",
          content: response.response,
          timestamp: Date.now(),
        });
      }

      deps.sessions.set(batch.chatGuid, state);
    } catch (error) {
      console.warn("[server] Agent turn failed, sending fallback.", {
        error: error instanceof Error ? error.message : String(error),
      });

      await deliverResponse(batch.chatGuid, deps.deliveryTargets, {
        response: AGENT_ERROR_FALLBACK,
      });
    }
  };
}
