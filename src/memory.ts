import Supermemory from "supermemory";

let client: Supermemory | null = null;
let currentSender = "unknown";

export function sanitizeTag(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function getSupermemoryClient(): Supermemory | null {
  if (!process.env.SUPERMEMORY_API_KEY) return null;
  if (!client) {
    client = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY });
  }
  return client;
}

export function setCurrentSender(sender: string): void {
  currentSender = sender;
}

export function getCurrentSender(): string {
  return currentSender;
}

export async function saveToSupermemory(fact: string): Promise<boolean> {
  const sm = getSupermemoryClient();
  if (!sm) return false;

  try {
    await sm.add({
      content: fact,
      containerTag: sanitizeTag(currentSender),
    });
    console.log(`[memory] Saved: ${fact}`);
    return true;
  } catch (error) {
    console.error("[memory] Failed to save to Supermemory:", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function searchMemories(query: string, sender: string): Promise<string[]> {
  const sm = getSupermemoryClient();
  if (!sm) return [];

  try {
    const response = await sm.search.documents({
      q: query,
      containerTags: [sanitizeTag(sender)],
    });

    const memories: string[] = [];
    for (const result of response.results ?? []) {
      for (const chunk of result.chunks ?? []) {
        if (chunk.isRelevant && chunk.content) {
          memories.push(chunk.content);
        }
      }
    }
    console.log(`[memory] Search "${query}" -> ${memories.length} results`);
    return memories;
  } catch (error) {
    console.error("[memory] Failed to search Supermemory:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getUserProfile(sender: string): Promise<{ static: string[]; dynamic: string[] } | null> {
  const sm = getSupermemoryClient();
  if (!sm) return null;

  try {
    const response = await sm.profile({
      containerTag: sanitizeTag(sender),
    });
    const total = (response.profile?.static?.length ?? 0) + (response.profile?.dynamic?.length ?? 0);
    console.log(`[memory] Profile for ${sender}: ${total} facts`);
    return response.profile;
  } catch (error) {
    console.error("[memory] Failed to get profile from Supermemory:", error instanceof Error ? error.message : error);
    return null;
  }
}
