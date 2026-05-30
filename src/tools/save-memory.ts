import { tool } from "ai";
import { z } from "zod";
import { saveToSupermemory } from "../memory.js";

export const saveMemory = tool({
  description:
    "Save a fact about a person or preference to long-term memory. Call whenever you learn something new — dietary needs, preferences, birthdays, relationships, interests.",
  inputSchema: z.object({
    fact: z.string().describe(
      "A clean, natural fact, e.g. 'Alex hates crowded spots', 'Sarah is vegetarian'."
    ),
  }),
  execute: async ({ fact }) => {
    const saved = await saveToSupermemory(fact);
    const status = saved ? "Saved to memory" : "Noted (memory service unavailable)";
    console.log(`[agent] tool:done saveMemory "${status}"`);
    return `${status}: ${fact}`;
  },
});
