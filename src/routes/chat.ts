import { Router } from "express";
import { AGENT_ERROR_FALLBACK } from "../constants.js";
import { runAgentTurn } from "../agent.js";
import type { AgentChatRequest, AgentChatResponse, BridgeAttachment } from "../types.js";

export const chatRouter = Router();

interface ChatBody {
  message: string;
  sender?: string;
  chatGuid?: string;
  isGroupChat?: boolean;
  attachments?: BridgeAttachment[];
  conversationHistory?: AgentChatRequest["conversationHistory"];
}

chatRouter.post("/", async (req, res) => {
  try {
    const body = req.body as ChatBody;

    if (!body.message || typeof body.message !== "string") {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const request: AgentChatRequest = {
      chatGuid: body.chatGuid ?? "debug-chat",
      sender: body.sender ?? "debug-user",
      message: body.message,
      isGroupChat: body.isGroupChat ?? false,
      taskType: "NEW_TASK",
      attachments: body.attachments ?? [],
      conversationHistory: body.conversationHistory,
    };

    const response: AgentChatResponse = await runAgentTurn(request);
    res.json(response);
  } catch (error) {
    console.error("[chat] POST /api/chat failed:", error);
    res.status(500).json({
      error: "Agent turn failed",
      response: AGENT_ERROR_FALLBACK,
    });
  }
});
