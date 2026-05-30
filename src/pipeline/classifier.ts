import type { TaskType } from "../types.js";

const followUpPrefix =
  /^(and|also|actually|wait|make it|change|book|yeah|yes|no|add|remove|instead|update|plus)\b/i;

export interface ClassificationInput {
  messageText: string;
  nowMs: number;
  previousMessageAtMs?: number;
  followUpWindowMs: number;
}

export function classifyTask(input: ClassificationInput): TaskType {
  if (!input.previousMessageAtMs) {
    return "NEW_TASK";
  }

  const elapsedMs = input.nowMs - input.previousMessageAtMs;
  if (elapsedMs > input.followUpWindowMs) {
    return "NEW_TASK";
  }

  const normalized = input.messageText.trim().toLowerCase();
  if (normalized.length === 0) {
    return "FOLLOW_UP";
  }

  if (followUpPrefix.test(normalized)) {
    return "FOLLOW_UP";
  }

  if (normalized.length < 120) {
    return "FOLLOW_UP";
  }

  return "NEW_TASK";
}
