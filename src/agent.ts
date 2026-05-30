import "./env.js";
import { streamText, stepCountIs } from "ai";
import { tools } from "./tools/index.js";
import { DOZE_SYSTEM_PROMPT } from "./prompts/system.js";
import { prepareAgentContext } from "./prompt/prepare-context.js";
import { buildUserContent, getImageAttachments } from "./prompt/images.js";
import { parseAgentOutput } from "./prompt/parse-output.js";
import { drainPendingAttachments, setAvailablePhotos } from "./attachments.js";
import { getVertexModel } from "./vertex.js";
import type { AgentChatRequest, AgentChatResponse } from "./types.js";

export async function runAgentTurn(request: AgentChatRequest): Promise<AgentChatResponse> {
  const promptText = await prepareAgentContext(request);

  const images = getImageAttachments(request.attachments ?? []);
  setAvailablePhotos(images.map((img) => img.filePath!).filter(Boolean));

  const userContent = await buildUserContent(promptText, request.attachments ?? []);

  console.log(
    `[server] Incoming ${request.taskType} from ${request.sender}: "${request.message.slice(0, 100)}${request.message.length > 100 ? "..." : ""}"`
  );

  let resultText = "";

  try {
    const result = streamText({
      model: getVertexModel(),
      system: DOZE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      tools,
      stopWhen: stepCountIs(15),
    });

    for await (const chunk of result.textStream) {
      resultText += chunk;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[server] streamText threw:", errorMessage);
    resultText = "Sorry, something went wrong on my end. Try again in a sec?";
  }

  if (!resultText.trim()) {
    resultText = "Hmm, I didn't come up with a response. Could you try rephrasing?";
  }

  const parsed = parseAgentOutput(resultText);

  const response: AgentChatResponse = { response: parsed.text };
  if (parsed.messages.length > 1) {
    response.messages = parsed.messages;
  }
  if (parsed.reaction) {
    response.reaction = parsed.reaction;
  }

  const attachments = drainPendingAttachments();
  if (attachments.length > 0) {
    response.attachments = attachments.map(({ filePath, fileName }) => ({
      filePath,
      fileName,
    }));
  }

  console.log(
    `[server] Response: "${response.response.slice(0, 100)}${response.response.length > 100 ? "..." : ""}"`
  );

  return response;
}
