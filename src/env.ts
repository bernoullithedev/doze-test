/**
 * Ensures environment variables are available before other modules initialize.
 *
 * - Local: loads project-root `.env` and `.env.local` when those files exist.
 * - Production (Vercel, EC2, ECS, Railway, etc.): skips files; the platform
 *   already populated `process.env`. `override: false` on `.env` keeps platform
 *   values; `.env.local` overrides only when present locally.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(projectRoot, ".env");
const envLocalPath = resolve(projectRoot, ".env.local");

if (existsSync(envPath)) {
  config({ path: envPath, override: false });
}

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}
