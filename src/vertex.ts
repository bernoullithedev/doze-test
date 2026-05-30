import { createVertex } from "@ai-sdk/google-vertex";

const DEFAULT_MODEL = "gemini-2.0-flash";

export function getVertexClient() {
  return createVertex({
    apiKey: process.env.GOOGLE_VERTEX_API_KEY,
  });
}

export function getVertexModel(modelId?: string) {
  const vertex = getVertexClient();
  return vertex(modelId ?? process.env.VERTEX_MODEL ?? DEFAULT_MODEL);
}

export function getVertexImageModel(modelId = "imagen-4.0-generate-001") {
  const vertex = getVertexClient();
  return vertex.image(modelId);
}
