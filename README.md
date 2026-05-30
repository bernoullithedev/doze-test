# doze-test

Public hackathon sandbox for a minimal **Doze** concierge: **Express** + **Vercel AI SDK** + **Google Vertex**, with Telegram ingress and a small set of practical and fun agent tools.

**Full build plan, tool roster, env vars, demo script, and commit-farm workflow:** see [plan.md](./plan.md).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- A Telegram bot token from [@BotFather](https://t.me/BotFather) (for the demo)
- API keys listed in [.env.example](./.env.example)

## Setup

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local with your keys (never commit secrets)
```

Copy required values from the doze project where noted (e.g. `SUPERMEMORY_API_KEY`). Set `OUTDOZE_API_BASE_URL` to the **staging** Outdoze deployment, not production.

## Run

**Development** (watch mode):

```bash
pnpm dev
```

**Production-style start:**

```bash
pnpm start
```

**Typecheck:**

```bash
pnpm typecheck
```

**Build** (emit `dist/`):

```bash
pnpm build
```

The server listens on `http://localhost:4000` by default (`SERVER_PORT` overrides).

## Health check

```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

## Telegram (demo ingress)

Once ingress is wired (see `src/index.ts` TODOs), set `TELEGRAM_BOT_TOKEN` in `.env.local` and start the server. Open a DM with your bot on Telegram — messages will flow through the agent loop and replies appear in-thread.

Do not run **doze** and **doze-test** against the same bot token at the same time (polling conflicts).

## Optional local chat UI

When `public/index.html` exists, the server serves it at `/`. Use it to `POST /api/chat` for local debugging without Telegram once the chat route is implemented.

## Project status

Foundation (Phase 0–1) provides Express shell, env bootstrap, and shared chat types. Agent, tools, memory, and Telegram wiring land in later phases — see [plan.md](./plan.md).
