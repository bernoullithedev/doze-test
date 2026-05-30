import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { readFile } from "node:fs/promises";
import { getAvailablePhotos } from "../attachments.js";
import { getVertexModel } from "../vertex.js";

export const roastOutfit = tool({
  description:
    "Playfully roast the user's outfit from a photo they sent. Loving tease, not mean. Requires an image in the current message or imagePath.",
  inputSchema: z.object({
    imagePath: z.string().optional().describe("Path to outfit photo; defaults to latest user attachment"),
    intensity: z.enum(["gentle", "medium", "savage"]).optional().describe("Roast intensity, default medium"),
  }),
  execute: async ({ imagePath, intensity }) => {
    const path = imagePath ?? getAvailablePhotos()[0];
    if (!path) {
      return "Send me a photo of your fit first — I need something to roast.";
    }

    if (!process.env.GOOGLE_VERTEX_API_KEY) {
      return `[STUB] Would roast outfit at ${path}. Set GOOGLE_VERTEX_API_KEY for multimodal roast.`;
    }

    try {
      const data = await readFile(path);
      const level = intensity ?? "medium";
      const { text } = await generateText({
        model: getVertexModel(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You're Doze, a witty friend on Telegram. Roast this outfit (${level} intensity) — playful, specific, loving. No cruelty or body shaming. 2-4 short sentences, texting voice, no markdown.`,
              },
              { type: "image", image: data, mediaType: "image/jpeg" },
            ],
          },
        ],
      });

      console.log(`[agent] tool:done roastOutfit`);
      return text.trim() || "Honestly? I can't hate — you're carrying it.";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[agent] tool:done roastOutfit error: ${message}`);
      return `Couldn't roast that fit: ${message}`;
    }
  },
});
