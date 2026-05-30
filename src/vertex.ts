import { createVertex } from "@ai-sdk/google-vertex";

const DEFAULT_MODEL = "gemini-2.0-flash";

// Express mode defaults to the v1 endpoint, but @ai-sdk/google (3.0.74+) sends
// `id` on functionCall/functionResponse replay — a field v1 rejects. OAuth/project
// auth already uses v1beta1, which accepts those fields.
const EXPRESS_MODE_BASE_URL =
  "https://aiplatform.googleapis.com/v1beta1/publishers/google";

export function getVertexClient() {
  return createVertex({
    apiKey: process.env.GOOGLE_VERTEX_API_KEY,
    baseURL: EXPRESS_MODE_BASE_URL,
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
