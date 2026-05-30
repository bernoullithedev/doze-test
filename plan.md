# doze-test — Hackathon build plan

> **Repo:** `bernoullithedev/doze-test` (public, separate from the Sunday monorepo)  
> **Stack decision:** Express HTTP server + Vercel AI SDK + Google Vertex (Gemini). **Not** Next.js.  
> **Workflow:** **Commit farm** — one conventional commit per mini feature (see [Commit farm](#commit-farm-guidelines)).

---

## Project goal & demo narrative

**What we are building:** A minimal **Doze-style concierge** you can demo in a browser in under a minute: type a message, the agent reasons with **~7 tools** (mix of practical + fun), optionally returns **generated images**, and remembers simple facts for the session or via lightweight memory.

**Story for judges:**

1. *“This is Doze stripped to the hackathon essentials — same agent loop patterns as our production codebase, but no iMessage bridge, no payments, no browser checkout.”*
2. *“Vertex Gemini drives tool calling through the Vercel AI SDK — one Express server, one chat page.”*
3. *“Watch it manage a list, remember your name, pick a restaurant when we’re indecisive, generate a poster for tonight, and roast an outfit if you upload a photo.”*

**Non-goals for v0:** Spectrum/iMessage ingress, Telegram/WhatsApp adapters, Stagehand browse/checkout, Vapi calls, Stripe payments, Partiful events, full Supermemory production wiring.

---

## Architecture

```
┌─────────────┐     POST /api/chat      ┌──────────────────────────────────┐
│  public/    │  JSON { message, ... }  │  Express (src/index.ts)          │
│  index.html │ ──────────────────────► │  • static files                  │
│  (chat UI)  │ ◄── JSON + attachments  │  • POST /api/chat → runAgentTurn │
└─────────────┘                         │  • GET /health                   │
                                        └──────────────┬───────────────────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────────────┐
                                        │  src/agent.ts                    │
                                        │  streamText + tools + Vertex     │
                                        └──────────────┬───────────────────┘
                                                       │
                       ┌───────────────────────────────┼───────────────────────────────┐
                       ▼                               ▼                               ▼
              src/tools/*.ts                   src/prompts/system.ts            src/memory.ts
              (Zod + tool())                   (persona + tool hints)           (in-memory Map v0)
```

### Express app structure (target)

| Path | Purpose |
|------|---------|
| `src/index.ts` | Create app, `express.json()`, serve `public/`, mount routes, listen on `SERVER_PORT` (default `4000`). |
| `src/routes/chat.ts` | `POST /api/chat` — validate body, call `runAgentTurn`, return `AgentChatResponse`. |
| `src/agent.ts` | `runAgentTurn(request)` — `streamText` with Vertex model, registered tools, step limit. |
| `src/env.ts` | Load `.env` locally only (mirror doze). |
| `src/types.ts` | `AgentChatRequest`, `AgentChatResponse`, `ConversationTurn`, attachments. |
| `public/index.html` | Single-page chat: message input, optional image upload (base64 or multipart), display replies + image URLs. |
| `src/tools/index.ts` | Export `tools` object for AI SDK. |
| `src/attachments.ts` | Queue generated images for response payload (pattern from doze). |

**Chat contract (v0):**

```json
POST /api/chat
{
  "message": "string",
  "sender": "demo-user",
  "history": [{ "role": "user"|"assistant", "content": "..." }],
  "attachments": [{ "fileName": "photo.jpg", "base64": "..." }]
}
```

Response mirrors doze `AgentChatResponse`: `{ "response": "...", "attachments"?: [...], "messages"?: [...] }`.

---

## Stack & dependencies

Mirror **doze** (`bernoullithedev/doze` private) where possible; drop ingress and heavy integrations.

| Package | Role |
|---------|------|
| `express` | HTTP server (user requirement). |
| `ai` | `streamText`, `tool`, `stepCountIs`. |
| `@ai-sdk/google-vertex` | `createVertex`, Gemini model. |
| `zod` | Tool input schemas. |
| `dotenv` | Local env loading via `src/env.ts`. |
| `tsx` | Dev watch (`pnpm dev`). |
| `typescript` | Strict TS, ESM (`"type": "module"`). |

**Optional v0.1:** `supermemory` only if time — otherwise **`src/memory.ts`** as in-process `Map<sender, string[]>` with `saveMemory` / `searchMemory` tools wrapping it.

**Explicitly not in v0:** `@browserbasehq/stagehand`, `spectrum-ts`, `chat` adapters, `@ai-sdk/amazon-bedrock` (Sunday WIP server uses Bedrock in places; **this demo is Vertex-only**).

---

## Tool roster (final ~7)

Tools the bot **will** register in v0. Each tool = one commit farm milestone when implemented.

### Practical (from doze patterns)

| Tool | Source inspiration | Demo behavior |
|------|-------------------|---------------|
| **`manageList`** | `doze/src/tools/manage-list.ts` | CRUD a named list (“groceries”, “packing”) in memory; agent adds/removes/items. |
| **`saveMemory`** | `doze/src/tools/save-memory.ts` | Persist a short fact keyed by `sender` (in-memory store v0). |
| **`searchMemory`** | `doze/src/tools/search-memory.ts` | Keyword / simple match over saved facts for `sender`. |
| **`suggestPlan`** | `doze/src/tools/save-plan.ts` (simplified) | **Mock** evening plan: returns structured JSON (dinner idea, activity, vibe) without external APIs — fast and reliable on stage. |

### Fun (hackathon demo)

| Tool | Behavior |
|------|----------|
| **`generatePoster`** | Vertex image generation — event title + vibe → PNG saved under `/tmp/doze-test-artifacts`, URL returned in attachments. Port logic from `doze/src/tools/generate-poster.ts`. |
| **`pickRestaurant`** | Random picker from a curated list (city + cuisine filters); optional `rollDice` sub-action using `Math.random()` — “we can’t decide, pick for us.” |
| **`fortuneCookie`** | Returns a whimsical fortune + “lucky number”; zero external deps — good filler between heavier tool calls. |
| **`moodPlaylist`** | **Stub:** given mood string, returns a fake 5-track playlist (title + artist strings) — demonstrates personality without Spotify OAuth. |
| **`roastOutfit`** | Text-only roast from user message + optional **image attachment** (multimodal user content in agent); no separate vision API if Gemini sees the image in the message. Keep tone playful, not mean — system prompt guardrails. |

**Collage (`generateCollage`)** — stretch goal after poster works; copy `doze/src/tools/generate-collage.ts` + `setAvailablePhotos` hook from `agent.ts` if time.

### Explicitly EXCLUDED from v0

- `browse-website` / Stagehand checkout  
- `make-call` / Vapi  
- `process-payment`  
- `create-event-partiful`, full Partiful flow  
- `search-products` (Perplexity) — optional phase 2  
- Spectrum / iMessage / bridge pipeline (`sunday/services/bridge`)  
- Full Telegram/WhatsApp ingress from doze `index.ts`

---

## What to copy from doze vs Sunday

### Prefer **doze** (primary template)

| doze path | Use in doze-test |
|-----------|------------------|
| `src/env.ts` | Dotenv bootstrap before other imports. |
| `src/agent.ts` | Vertex + `streamText` + `tools` + `runAgentTurn` shape. |
| `src/types.ts` | Request/response types. |
| `src/tools/index.ts` | Tool registration pattern. |
| `src/tools/manage-list.ts` | List tool (trim deps). |
| `src/tools/save-memory.ts`, `search-memory.ts` | Adapt to in-memory backend if skipping Supermemory. |
| `src/tools/generate-poster.ts`, `generate-collage.ts` | Image tools + artifact paths. |
| `src/attachments.ts` | Drain attachments into HTTP response. |
| `src/prompts/system.ts` | Persona (shorten for demo). |
| `src/prompt/prepare-context.ts`, `images.ts`, `parse-output.ts` | If multimodal + multi-bubble replies needed. |
| `src/memory.ts` | Reference for Supermemory — swap to Map for demo. |

### Reference **Sunday** monorepo (context only)

| Sunday path | Notes |
|-------------|--------|
| `services/agent/` | Legacy **Claude Agent SDK** + MCP tools — **do not port** for this demo. |
| `services/server/` | WIP AI SDK server; similar shape to doze but **Bedrock** appears in agent paths — use doze’s Vertex wiring instead. |
| `services/bridge/` | iMessage pipeline — **out of scope** (avoids “is this just iMessage?” suspicion). |
| `packages/shared/` | Shared Zod config types — optional copy of minimal chat types only. |

**Rule:** Copy **ideas and file structure**, not `.env` or API keys. Re-implement minimal slices in doze-test with fresh commits.

---

## Commit farm guidelines

**Policy:** After every **mini feature** that compiles and runs (or adds an isolated tool test), commit immediately. Keeps demo bisectable and shows velocity to judges.

**Mini feature examples:**

- scaffold Express + health route  
- add `env.ts` + `.env.example`  
- add `POST /api/chat` stub  
- wire Vertex + echo agent  
- add `manageList` tool only  
- add static chat UI  
- one fun tool per commit  

**Conventional commit format:**

```
feat(tools): add manageList in-memory list CRUD
feat(server): expose POST /api/chat with Zod validation
feat(ui): minimal public/index.html chat client
feat(agent): wire Vertex gemini flash via @ai-sdk/google-vertex
feat(tools): add fortuneCookie stub
fix(agent): drain image attachments into response
docs: update plan phase checkboxes
chore: add .env.example without secrets
```

**Do not** batch unrelated tools in one commit during the hackathon build night.

---

## Implementation phases

### Phase 0 — Repo & plan

- [x] Public GitHub repo `doze-test`  
- [x] `plan.md` + minimal `README.md`  
- [ ] `.gitignore` (node_modules, .env, artifacts)

### Phase 1 — Skeleton (commits 1–4)

- [ ] `package.json`, `tsconfig.json`, `pnpm` or `npm` lock  
- [ ] `src/env.ts`, `src/index.ts`, `GET /health`  
- [ ] `src/types.ts`, stub `runAgentTurn`  
- [ ] `.env.example` documented below  

### Phase 2 — Agent core (commits 5–7)

- [ ] Vertex client in `src/agent.ts`  
- [ ] `src/prompts/system.ts` (Doze voice, safety, tool usage)  
- [ ] Register tools incrementally in `src/tools/index.ts`  
- [ ] `POST /api/chat` end-to-end text-only  

### Phase 3 — Tools (one commit each)

- [ ] `manageList`  
- [ ] `saveMemory` + `searchMemory`  
- [ ] `suggestPlan` (mock)  
- [ ] `pickRestaurant` / dice  
- [ ] `fortuneCookie`  
- [ ] `moodPlaylist` stub  
- [ ] `generatePoster`  
- [ ] `roastOutfit` (multimodal)  
- [ ] (stretch) `generateCollage`  

### Phase 4 — UI & demo polish

- [ ] `public/index.html` chat UI  
- [ ] Image upload → attachments in request  
- [ ] Serve artifact URLs or base64 inline  
- [ ] README run instructions  

### Phase 5 — Hardening

- [ ] Basic error handling in agent (friendly fallback string)  
- [ ] `pnpm typecheck` clean  
- [ ] Rehearse 60s demo script  

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_VERTEX_API_KEY` | Yes (v0 path) | Vertex API key for `@ai-sdk/google-vertex` (matches doze `agent.ts` apiKey style). |
| `GOOGLE_VERTEX_PROJECT_ID` | If using ADC | Project id if switching from API key to service account. |
| `GOOGLE_VERTEX_CLIENT_EMAIL` | Optional | Service account email (production-style auth). |
| `GOOGLE_VERTEX_PRIVATE_KEY` | Optional | PEM private key (`\n` escaped in .env). |
| `VERTEX_MODEL` | Optional | Default e.g. `gemini-2.0-flash` or team’s preview id. |
| `SERVER_PORT` | Optional | Default `4000`. |
| `ARTIFACT_DIR` | Optional | Default `/tmp/doze-test-artifacts` for posters. |
| `SUPERMEMORY_API_KEY` | No (v0) | Only if wiring real Supermemory instead of in-memory. |

Never commit `.env`. Document all keys in `.env.example` with placeholder values only.

---

## 60-second demo script

1. **Open** `http://localhost:4000` — show simple chat UI.  
2. **Say:** “Remember my name is Alex and I’m vegetarian.” → watch **`saveMemory`**.  
3. **Ask:** “Add oat milk to my groceries list.” → **`manageList`**.  
4. **Ask:** “We can’t pick dinner — surprise me, Japanese, San Francisco vibe.” → **`pickRestaurant`**.  
5. **Ask:** “Make a poster for ‘Build Night Pizza’ — retro neon vibe.” → **`generatePoster`**, show image.  
6. **Upload** a outfit photo: “Roast my fit for build night.” → **`roastOutfit`** / multimodal reply.  
7. **Close:** “Fortune cookie before we ship?” → **`fortuneCookie`**.  

Backup if image gen fails: lean on **`fortuneCookie`**, **`moodPlaylist`**, and **`suggestPlan`**.

---

## Risks & gotchas

| Risk | Mitigation |
|------|------------|
| Vertex quota / model id drift | Pin model in env; test key before demo; fallback message in `agent.ts` catch block (doze pattern). |
| Image tool latency | Generate poster earlier in script; keep collage as stretch. |
| Accidentally copying secrets | Only `.env.example` in repo; use commit farm to review diffs. |
| Scope creep into Sunday bridge | Any iMessage/Spectrum code is a hard no for v0. |
| `exactOptionalPropertyTypes` / strict TS | Match doze tsconfig strictness early to avoid end-of-night type fires. |
| Multimodal size limits | Resize/compress uploads in UI before base64 POST. |
| In-memory memory lost on restart | Accept for demo; mention Supermemory as phase 2. |

---

## Success criteria

- Express serves UI + **`POST /api/chat`** with Vertex agent loop.  
- **7 tools** registered and demonstrably invoked in the demo script.  
- **Commit farm** history shows incremental features.  
- No secrets in git; judges can clone and run with their own Vertex key.

---

*Last updated: build night — consolidated from Sunday/Doze research and final user decisions (public repo, Express, fun tools, commit farm).*
