import { tool } from "ai";
import { z } from "zod";
import { generateImage } from "ai";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { addPendingAttachment } from "../attachments.js";
import { getVertexImageModel } from "../vertex.js";

function artifactDir(): string {
  return process.env.ARTIFACT_DIR ?? "/tmp/doze-test-artifacts";
}

function buildInvitePrompt(args: {
  title?: string;
  date?: string;
  location?: string;
  host?: string;
  description?: string;
  style?: string;
}): string {
  const style = args.style ?? "modern minimalist neon";
  let prompt = `Beautiful event invite poster, portrait 9:16, premium Luma/Partiful aesthetic.\n`;
  if (args.title) prompt += `Title: "${args.title}"\n`;
  if (args.date) prompt += `Date: ${args.date}\n`;
  if (args.location) prompt += `Location: ${args.location}\n`;
  if (args.host) prompt += `Host: ${args.host}\n`;
  if (args.description) prompt += `Vibe: ${args.description}\n`;
  prompt += `Style: ${style}. Bold hero title, legible text, atmospheric background, no watermarks.`;
  return prompt;
}

export const generatePoster = tool({
  description:
    "Generate a beautiful event invite image. Call with whatever info you have — all fields optional.",
  inputSchema: z.object({
    title: z.string().optional().describe("Event title"),
    date: z.string().optional().describe("Date/time"),
    location: z.string().optional().describe("Venue or location"),
    host: z.string().optional().describe("Host name"),
    description: z.string().optional().describe("Visual vibe or theme"),
    style: z.string().optional().describe("Visual style"),
  }),
  execute: async (args) => {
    if (!process.env.GOOGLE_VERTEX_API_KEY) {
      return `[STUB] Would generate poster for "${args.title ?? "untitled event"}". Set GOOGLE_VERTEX_API_KEY for image generation.`;
    }

    try {
      const prompt = buildInvitePrompt(args);
      const { image } = await generateImage({
        model: getVertexImageModel(),
        prompt,
        aspectRatio: "9:16",
      });

      const dir = artifactDir();
      await mkdir(dir, { recursive: true });
      const fileName = `poster-${randomUUID()}.png`;
      const filePath = join(dir, fileName);
      await writeFile(filePath, image.uint8Array);

      addPendingAttachment(filePath, fileName);
      console.log(`[agent] tool:done generatePoster ${filePath}`);
      return `Poster generated: ${args.title ?? "event invite"}. Image attached.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[agent] tool:done generatePoster error: ${message}`);
      return `Failed to generate poster: ${message}`;
    }
  },
});
