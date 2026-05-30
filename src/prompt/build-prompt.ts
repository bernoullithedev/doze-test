import type { AgentChatRequest } from "../types.js";
import { getImageAttachments } from "./images.js";

export function buildPrompt(
  request: AgentChatRequest,
  supermemories: string[],
  profile: { static: string[]; dynamic: string[] } | null
): string {
  const allMemories = [...(request.memories ?? []), ...supermemories];
  const memoriesBlock =
    allMemories.length > 0 ? allMemories.join("\n") : "No memories yet.";

  let profileBlock = "";
  if (profile) {
    const staticFacts = profile.static.length > 0 ? profile.static.join("\n") : "";
    const dynamicFacts = profile.dynamic.length > 0 ? profile.dynamic.join("\n") : "";
    if (staticFacts || dynamicFacts) {
      profileBlock = `\n<user_profile>\n${staticFacts}${staticFacts && dynamicFacts ? "\n" : ""}${dynamicFacts}\n</user_profile>`;
    }
  }

  let historyBlock = "This is a new conversation.";
  if (request.conversationHistory && request.conversationHistory.length > 0) {
    historyBlock = request.conversationHistory
      .map((turn) => {
        if (turn.role === "assistant") return `Doze: ${turn.content}`;
        const label = turn.sender ? `${turn.sender}` : "User";
        return `${label}: ${turn.content}`;
      })
      .join("\n");
  }

  const chatType = request.isGroupChat ? "group chat" : "direct message";

  const imageCount = getImageAttachments(request.attachments ?? []).length;
  const imageNote = imageCount > 0 ? `\n\n[${imageCount} image(s) attached]` : "";

  return `<context>
<memories>
${memoriesBlock}
</memories>${profileBlock}
<conversation_history>
${historyBlock}
</conversation_history>
</context>

<message>
From: ${request.sender} | Chat type: ${chatType} | Task: ${request.taskType}

${request.message}${imageNote}
</message>`;
}

export function mergeProfiles(
  profiles: Array<{ static: string[]; dynamic: string[] } | null>
): { static: string[]; dynamic: string[] } | null {
  const merged = { static: [] as string[], dynamic: [] as string[] };
  let hasAny = false;
  for (const p of profiles) {
    if (!p) continue;
    hasAny = true;
    merged.static.push(...p.static);
    merged.dynamic.push(...p.dynamic);
  }
  return hasAny ? merged : null;
}
