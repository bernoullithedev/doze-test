import type { IncomingChatMessage } from "../types.js";

export function telegramMessageToIncoming(input: {
  text: string;
  userId: string;
  messageId?: string;
}): IncomingChatMessage {
  const chatGuid = `telegram:${input.userId}`;
  return {
    chatGuid,
    sender: input.userId,
    text: input.text,
    isGroupChat: false,
    receivedAt: Date.now(),
    attachments: [],
    ...(input.messageId ? { messageGuid: input.messageId } : {}),
  };
}
