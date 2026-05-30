import { z } from "zod";

const intEnv = (defaultValue: number, min: number) =>
  z.preprocess((value) => {
    if (value === undefined) {
      return defaultValue;
    }
    if (typeof value === "string") {
      return Number.parseInt(value, 10);
    }
    return value;
  }, z.number().int().min(min));

const positiveIntEnv = (defaultValue: number) => intEnv(defaultValue, 1);
const nonNegativeIntEnv = (defaultValue: number) => intEnv(defaultValue, 0);

const serverEnvSchema = z.object({
  DEBOUNCE_WINDOW_MS: positiveIntEnv(2000),
  FOLLOW_UP_WINDOW_MS: positiveIntEnv(600000),
  AGENT_MAX_RETRIES: nonNegativeIntEnv(2),
  AGENT_RETRY_BASE_MS: positiveIntEnv(600),
  DEDUPE_WINDOW_MS: positiveIntEnv(300000),
});

export interface ServerConfig {
  debounceWindowMs: number;
  followUpWindowMs: number;
  agentMaxRetries: number;
  agentRetryBaseMs: number;
  dedupeWindowMs: number;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = serverEnvSchema.parse(env);
  return {
    debounceWindowMs: parsed.DEBOUNCE_WINDOW_MS,
    followUpWindowMs: parsed.FOLLOW_UP_WINDOW_MS,
    agentMaxRetries: parsed.AGENT_MAX_RETRIES,
    agentRetryBaseMs: parsed.AGENT_RETRY_BASE_MS,
    dedupeWindowMs: parsed.DEDUPE_WINDOW_MS,
  };
}
