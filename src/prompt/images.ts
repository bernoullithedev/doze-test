import type { BridgeAttachment } from "../types.js";
import type { ImagePart, TextPart } from "ai";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
]);

const SUPPORTED_MEDIA_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function getImageAttachments(attachments: BridgeAttachment[]): BridgeAttachment[] {
  return attachments.filter(
    (a) => a.filePath && a.mimeType && IMAGE_MIME_TYPES.has(a.mimeType)
  );
}

export async function buildImageParts(images: BridgeAttachment[]): Promise<ImagePart[]> {
  const parts: ImagePart[] = [];
  for (const img of images) {
    try {
      const mime = img.mimeType ?? "";
      if (!SUPPORTED_MEDIA_TYPES.has(mime)) {
        console.warn(`[server] Skipping unsupported image type ${mime} for ${img.filePath}`);
        continue;
      }
      const { readFile } = await import("node:fs/promises");
      const data = await readFile(img.filePath!);
      parts.push({
        type: "image",
        image: data,
        mediaType: mime,
      });
    } catch (err) {
      console.warn(`[server] Failed to read image ${img.filePath}: ${err}`);
    }
  }
  return parts;
}

export async function buildUserContent(
  promptText: string,
  attachments: BridgeAttachment[]
): Promise<string | Array<TextPart | ImagePart>> {
  const images = getImageAttachments(attachments);
  if (images.length === 0) {
    return promptText;
  }

  const imageParts = await buildImageParts(images);
  if (imageParts.length === 0) {
    return promptText;
  }

  console.log(`[server] Including ${imageParts.length} image(s) in prompt`);
  return [{ type: "text", text: promptText }, ...imageParts];
}
