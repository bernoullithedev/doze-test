import { tool } from "ai";
import { z } from "zod";
import {
  createCall,
  pollCallStatus,
  buildAssistantInstructions,
  filterTranscript,
} from "../vapi-client.js";

export const makePhoneCall = tool({
  description:
    "Place an outbound AI voice call to make reservations or inquiries. ONLY use after explicit user confirmation. Test calls dial +19095069035; phoneNumber arg is venue context.",
  inputSchema: z.object({
    phoneNumber: z.string().describe("Venue phone number (context for the model)"),
    purpose: z.string().describe("Brief purpose, e.g. 'Dinner reservation Saturday 7pm, party of 2'"),
    questions: z.array(z.string()).describe("Specific questions for the voice agent — keep brief"),
  }),
  execute: async (args) => {
    if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
      console.warn("[makePhoneCall] Vapi not configured, stub mode");
      return `[DEMO MODE] Would call ${args.phoneNumber} about: ${args.purpose}\n\nQuestions:\n${args.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nSet VAPI_API_KEY and VAPI_PHONE_NUMBER_ID for live calls.`;
    }

    try {
      const instructions = buildAssistantInstructions(args.purpose, args.questions);
      const callId = await createCall(instructions);
      const call = await pollCallStatus(callId);
      const filteredInfo = await filterTranscript(call, args.purpose, args.questions);

      console.log(`[agent] tool:done makePhoneCall`);
      return `Call completed (venue ${args.phoneNumber}).\n\n${filteredInfo}`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[makePhoneCall] Error: ${errorMsg}`);
      return `Call failed: ${errorMsg}\n\nTry online booking or ask the venue directly.`;
    }
  },
});
