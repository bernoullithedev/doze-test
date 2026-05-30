import type { DebouncedMessageBatch, IncomingChatMessage } from "../types.js";

interface DebounceBucket {
  timer: NodeJS.Timeout;
  messages: IncomingChatMessage[];
}

type FlushHandler = (batch: DebouncedMessageBatch) => Promise<void>;

function hasMultipleSenders(messages: IncomingChatMessage[]): boolean {
  if (messages.length <= 1) {
    return false;
  }
  const first = messages[0]!.sender;
  return messages.some((m) => m.sender !== first);
}

function buildBatch(messages: IncomingChatMessage[]): DebouncedMessageBatch {
  const latest = messages[messages.length - 1];

  if (!latest) {
    throw new Error("Cannot build a batch from an empty message set.");
  }

  const attributeSenders = latest.isGroupChat && hasMultipleSenders(messages);

  const text = messages
    .map((message) => {
      const trimmed = message.text.trim();
      if (trimmed.length === 0) {
        return "";
      }
      return attributeSenders ? `${message.sender}: ${trimmed}` : trimmed;
    })
    .filter((value) => value.length > 0)
    .join("\n");

  const uniqueSenders = [...new Set(messages.map((m) => m.sender))];

  const batch: DebouncedMessageBatch = {
    chatGuid: latest.chatGuid,
    sender: latest.sender,
    senders: uniqueSenders,
    isGroupChat: latest.isGroupChat,
    text: text.length > 0 ? text : "[attachment-only message]",
    messages,
    receivedAt: latest.receivedAt,
  };

  if (latest.messageGuid) {
    batch.messageGuid = latest.messageGuid;
  }

  return batch;
}

export class MessageDebouncer {
  private readonly buckets = new Map<string, DebounceBucket>();

  constructor(
    private readonly debounceWindowMs: number,
    private readonly onFlush: FlushHandler
  ) {}

  push(message: IncomingChatMessage): void {
    const existing = this.buckets.get(message.chatGuid);
    if (existing) {
      clearTimeout(existing.timer);
      existing.messages.push(message);
      existing.timer = this.createTimer(message.chatGuid);
      return;
    }

    this.buckets.set(message.chatGuid, {
      timer: this.createTimer(message.chatGuid),
      messages: [message],
    });
  }

  dispose(): void {
    for (const bucket of this.buckets.values()) {
      clearTimeout(bucket.timer);
    }
    this.buckets.clear();
  }

  private createTimer(chatGuid: string): NodeJS.Timeout {
    return setTimeout(() => {
      this.flush(chatGuid).catch((error) => {
        console.error("[debouncer] Error flushing batch for chat", chatGuid, error);
      });
    }, this.debounceWindowMs);
  }

  private async flush(chatGuid: string): Promise<void> {
    const bucket = this.buckets.get(chatGuid);
    if (!bucket) {
      return;
    }

    this.buckets.delete(chatGuid);

    const batch = buildBatch(bucket.messages);
    await this.onFlush(batch);
  }
}
