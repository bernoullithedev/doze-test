import { tool } from "ai";
import { z } from "zod";
import { searchMemories, getCurrentSender } from "../memory.js";

export const searchMemory = tool({
  description:
    "Search long-term memory for facts about a person, preference, or topic — dietary needs, past orders, birthdays, etc.",
  inputSchema: z.object({
    query: z.string().describe("What to search for, e.g. 'dietary restrictions' or 'favorite cuisine'"),
  }),
  execute: async ({ query }) => {
    const sender = getCurrentSender();
    const results = await searchMemories(query, sender);

    if (results.length === 0) {
      console.log(`[agent] tool:done searchMemory (0 results)`);
      return "No matching memories found.";
    }

    console.log(`[agent] tool:done searchMemory (${results.length} results)`);
    return `Found ${results.length} memories:\n${results.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
  },
});
