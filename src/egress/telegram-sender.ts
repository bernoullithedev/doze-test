import { readFile } from "node:fs/promises";
import type { AgentChatResponse } from "../types.js";

const INTER_MESSAGE_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface TelegramThread {
  post: (content: unknown) => Promise<unknown>;
}

export async function sendAgentResponseToTelegram(
  thread: TelegramThread,
  payload: AgentChatResponse
): Promise<void> {
  const chunks =
    payload.messages && payload.messages.length > 0
      ? payload.messages
      : [payload.response.trim()];

  const messagesToSend = chunks.filter((c: string) => c.length > 0);
  if (messagesToSend.length === 0) {
    messagesToSend.push("On it.");
  }

  for (let i = 0; i < messagesToSend.length; i++) {
    if (i > 0) {
      await delay(INTER_MESSAGE_DELAY_MS);
    }
    await thread.post(messagesToSend[i]!);
  }

  for (const att of payload.attachments ?? []) {
    try {
      const data = await readFile(att.filePath);
      await thread.post({
        type: "file",
        filename: att.fileName ?? "attachment",
        data,
      });
    } catch (err) {
      console.warn(
        "[server] Telegram attachment send failed (adapter may not support files):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}
