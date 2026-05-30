import type { AgentChatRequest } from "../types.js";
import { setCurrentSender, searchMemories, getUserProfile } from "../memory.js";
import { buildPrompt, mergeProfiles } from "./build-prompt.js";

export async function prepareAgentContext(request: AgentChatRequest): Promise<string> {
  setCurrentSender(request.sender);

  const senders =
    request.senders && request.senders.length > 1 ? request.senders : [request.sender];

  const [memoryResults, profileResults] = await Promise.all([
    Promise.all(senders.map((s) => searchMemories(request.message, s))),
    Promise.all(senders.map((s) => getUserProfile(s))),
  ]);

  const supermemories = [...new Set(memoryResults.flat())];
  const profile = mergeProfiles(profileResults);

  if (supermemories.length > 0) {
    console.log(
      `[server] Retrieved ${supermemories.length} memories from Supermemory (${senders.length} sender(s))`
    );
  }

  return buildPrompt(request, supermemories, profile);
}
