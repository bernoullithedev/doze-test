/** Chat and agent types (standalone server — no workspace shared package). */

export type TaskType = "NEW_TASK" | "FOLLOW_UP";

export interface BridgeAttachment {
  id?: string;
  fileName?: string;
  mimeType?: string;
  filePath?: string;
  url?: string;
}

export interface IncomingChatMessage {
  chatGuid: string;
  sender: string;
  text: string;
  messageGuid?: string;
  isGroupChat: boolean;
  receivedAt: number;
  attachments: BridgeAttachment[];
}

export interface DebouncedMessageBatch {
  chatGuid: string;
  sender: string;
  senders?: string[];
  isGroupChat: boolean;
  messageGuid?: string;
  text: string;
  messages: IncomingChatMessage[];
  receivedAt: number;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sender?: string;
}

export interface AgentChatRequest {
  chatGuid: string;
  sender: string;
  senders?: string[];
  message: string;
  isGroupChat: boolean;
  taskType: TaskType;
  attachments: BridgeAttachment[];
  memories?: string[];
  conversationHistory?: ConversationTurn[];
}

export type TapbackReaction =
  | "love"
  | "like"
  | "dislike"
  | "laugh"
  | "emphasize"
  | "question";

export interface AgentChatResponse {
  response: string;
  messages?: string[];
  reaction?: TapbackReaction;
  silent?: boolean;
  effectId?: string;
  attachments?: Array<{
    filePath: string;
    fileName?: string;
  }>;
  memoriesToSave?: string[];
  toolsUsed?: string[];
}
