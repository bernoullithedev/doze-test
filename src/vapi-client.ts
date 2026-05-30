/**
 * Vapi Voice AI client for making outbound phone calls.
 */

import Anthropic from "@anthropic-ai/sdk";

const VAPI_BASE = "https://api.vapi.ai";
const HARDCODED_RECIPIENT = "+233598759502";

function getVapiConfig() {
  return {
    apiKey: process.env.VAPI_API_KEY,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
  };
}

interface VapiCall {
  id: string;
  status: "queued" | "ringing" | "in-progress" | "forwarding" | "ended";
  endedReason?: string;
  transcript?: string;
  messages?: Array<{
    role: "assistant" | "user" | "system";
    message: string;
    time: number;
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildAssistantInstructions(purpose: string, questions: string[]): string {
  return `You're helping a customer ${purpose.toLowerCase()}. You sound friendly and natural — warm, conversational, not robotic.

WHAT YOU'RE ASKING ABOUT:
${questions.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}

KEEP IT NATURAL:
- Use contractions, brief pauses are okay
- Wrap up warmly when you have what you need

NEVER ASK FOR confirmation numbers, reservation codes, or customer PII unless they offer it.`;
}

export async function createCall(instructions: string): Promise<string> {
  const { apiKey, phoneNumberId } = getVapiConfig();

  if (!apiKey || !phoneNumberId) {
    throw new Error("VAPI_API_KEY and VAPI_PHONE_NUMBER_ID must be set in environment");
  }

  console.log(`[vapi] Creating call to ${HARDCODED_RECIPIENT}`);

  const response = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId,
      customer: { number: HARDCODED_RECIPIENT },
      assistant: {
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.7,
          messages: [{ role: "system", content: instructions }],
        },
        voice: { provider: "11labs", voiceId: "paula" },
        firstMessage: "Hi, I'm calling on behalf of a customer to help with a reservation.",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) {
    throw new Error("Vapi API did not return a call ID");
  }

  console.log(`[vapi] Call created: ${data.id}`);
  return data.id;
}

export async function pollCallStatus(callId: string): Promise<VapiCall> {
  const { apiKey } = getVapiConfig();
  const maxWaitMs = 180_000;
  const pollIntervalMs = 3000;
  const startTime = Date.now();

  while (true) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Call polling timeout after ${maxWaitMs / 1000} seconds`);
    }

    const response = await fetch(`${VAPI_BASE}/call/${callId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vapi poll error: ${response.status} ${errorText}`);
    }

    const call = (await response.json()) as VapiCall;
    if (call.status === "ended") {
      return call;
    }

    await sleep(pollIntervalMs);
  }
}

function extractTranscriptText(call: VapiCall): string {
  if (call.messages && call.messages.length > 0) {
    return call.messages
      .map((msg) => `${msg.role === "assistant" ? "Agent" : "Restaurant"}: ${msg.message}`)
      .join("\n");
  }
  return call.transcript ?? "No transcript available";
}

function simpleTranscriptFilter(transcript: string): string[] {
  const keywordPatterns = [
    /\b(confirmed|confirmation|available|booked|reserved)\b/i,
    /\b(time|pm|am|o'clock)\b/i,
    /\b(parking|dress code|deposit)\b/i,
    /\b(sorry|unfortunately|not available|full)\b/i,
    /\b(party|people|guests|table)\b/i,
  ];

  return transcript
    .split("\n")
    .filter((line) => keywordPatterns.some((p) => p.test(line)))
    .map((line) => line.trim());
}

async function intelligentTranscriptFilter(
  transcript: string,
  purpose: string,
  questions: string[]
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Extract essential booking info from this call transcript. Purpose: ${purpose}. Questions: ${questions.join("; ")}. Be brief (3-4 sentences max).\n\n${transcript}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (textBlock && "text" in textBlock) {
    return textBlock.text;
  }
  return "Call completed. No clear outcome extracted.";
}

export async function filterTranscript(
  call: VapiCall,
  purpose: string,
  questions: string[]
): Promise<string> {
  const fullTranscript = extractTranscriptText(call);
  const essentialLines = simpleTranscriptFilter(fullTranscript);

  if (essentialLines.length > 0 && essentialLines.length < 15) {
    return essentialLines.join("\n");
  }

  if (fullTranscript.length > 500 || essentialLines.length > 15) {
    try {
      return await intelligentTranscriptFilter(fullTranscript, purpose, questions);
    } catch (err) {
      console.warn("[vapi] Intelligent filter failed:", err);
    }
  }

  if (essentialLines.length > 0) {
    return essentialLines.slice(0, 10).join("\n");
  }

  return "Call completed. Check logs for full transcript.";
}
