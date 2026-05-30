import { tool } from "ai";
import { z } from "zod";

export const searchProducts = tool({
  description:
    "Search for products, restaurants, prices, and reviews using real-time web search via Perplexity Sonar. Use when Outdoze doesn't cover the question — never invent prices.",
  inputSchema: z.object({
    query: z.string().describe("What to search for, e.g. 'trending date night restaurants East Legon'"),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.log(`[agent] tool:done searchProducts "API key not configured"`);
      return "Perplexity API key not configured. Unable to search.";
    }

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: query }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[agent] tool:done searchProducts "error ${response.status}"`);
        return `Search failed (${response.status}): ${errorText}`;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        citations?: string[];
      };

      const text = data.choices?.[0]?.message?.content ?? "No results found.";
      const citations = data.citations ?? [];

      let result = text;
      if (citations.length > 0) {
        result += "\n\nSources:\n" + citations.map((url, i) => `[${i + 1}] ${url}`).join("\n");
      }

      console.log(`[agent] tool:done searchProducts (${result.length} chars)`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[agent] tool:done searchProducts "error: ${message}"`);
      return `Search failed: ${message}`;
    }
  },
});
