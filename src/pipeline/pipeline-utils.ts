export function enqueueByChat(
  queues: Map<string, Promise<void>>,
  chatGuid: string,
  task: () => Promise<void>
): Promise<void> {
  const previous = queues.get(chatGuid) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (queues.get(chatGuid) === next) {
        queues.delete(chatGuid);
      }
    });

  queues.set(chatGuid, next);
  return next;
}

export function isDuplicateMessage(
  seenMessages: Map<string, number>,
  messageGuid: string,
  nowMs: number,
  dedupeWindowMs: number
): boolean {
  const seenAtMs = seenMessages.get(messageGuid);
  seenMessages.set(messageGuid, nowMs);
  if (seenAtMs === undefined) {
    return false;
  }
  return nowMs - seenAtMs <= dedupeWindowMs;
}

export function pruneSeenMessages(
  seenMessages: Map<string, number>,
  nowMs: number,
  dedupeWindowMs: number
): void {
  for (const [messageGuid, seenAtMs] of seenMessages.entries()) {
    if (nowMs - seenAtMs > dedupeWindowMs) {
      seenMessages.delete(messageGuid);
    }
  }
}
