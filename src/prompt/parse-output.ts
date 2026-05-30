import type { TapbackReaction } from "../types.js";

const VALID_REACTIONS = new Set<TapbackReaction>([
  "love",
  "like",
  "dislike",
  "laugh",
  "emphasize",
  "question",
]);
const REACT_REGEX = /^\[react:(\w+)\]\s*/;
const MESSAGE_SPLIT = /\n---\n/;

export interface ParsedOutput {
  text: string;
  messages: string[];
  reaction: TapbackReaction | undefined;
  effectId: string | undefined;
}

export function parseAgentOutput(raw: string): ParsedOutput {
  let text = raw;
  let reaction: TapbackReaction | undefined;

  const reactMatch = REACT_REGEX.exec(text);
  if (reactMatch) {
    const candidate = reactMatch[1] as TapbackReaction;
    if (VALID_REACTIONS.has(candidate)) {
      reaction = candidate;
      text = text.slice(reactMatch[0].length);
    }
  }

  const messages = text.split(MESSAGE_SPLIT).map((s) => s.trim()).filter(Boolean);

  return { text, messages, reaction, effectId: undefined };
}
