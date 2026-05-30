# doze-test — Hackathon build plan

> **Repo:** `bernoullithedev/doze-test` (public, separate from Sunday / private **doze**)  
> **Stack:** Express HTTP server + Vercel AI SDK + Google Vertex (Gemini), ported from **doze** (`bernoullithedev/doze`).  
> **Places / checkout data:** Direct HTTP to **Outdoze** staging API (no Stagehand, no prod `outdoze.com` for demo).  
> **Workflow:** **Commit farm** — one conventional commit per logical slice (see [Commit farm](#commit-farm-guidelines)).

---

## Project goal & demo narrative

**What we are building:** A **Doze-style concierge** reachable on **Telegram** for the hackathon demo, with the same agent loop and core tool patterns as doze, plus **Outdoze** for venue discovery and checkout-style info. Optional browser chat UI remains useful for local debugging.

**Story for judges:**

1. *“This is Doze narrowed to the demo surface: Telegram ingress, Vertex tool calling, Supermemory shared with our production Doze project, and Outdoze staging instead of browser automation.”*
2. *“Spectrum/iMessage is out of scope for this hackathon — v0 is Telegram-only so we ship the agent and Outdoze story without bridge work.”*
3. *"Watch it remember you, manage a list, search products via Perplexity, pull places from Outdoze (with a booking phone), confirm with you, place a **Vapi voice call** to book, and run the fun tools (poster, restaurant picker, fortune, playlist, outfit roast)."*

**Non-goals for v0:** Stagehand `browse-website` / DoorDash checkout flows, Partiful, Stripe payments, prod Outdoze traffic, **Spectrum/iMessage ingress** (any setup, adapters, or env for the hackathon). *(Vapi booking calls are in scope — see [Vapi booking calls](#vapi-booking-calls).)*

---

## Messaging ingress (v0)

**Telegram only** for the hackathon. Demo script and success criteria assume Telegram DMs. Optional browser `POST /api/chat` is for local debugging only.

| Channel | Hackathon (v0) |
|---------|----------------|
| **Telegram** | **In scope** | Port `doze/src/ingress/telegram-adapter.ts` + Chat SDK `createTelegramAdapter` polling from `doze/src/index.ts`. |
| **Spectrum / iMessage** | **Out of scope** | Confirmed **`skip_spectrum`**; not planned for this repo during the hackathon. No adapter copy, feature flags, or phased tasks. *Future:* may live in private **doze** / Sunday bridge patterns, not doze-test v0. |

If judges ask about iMessage: v0 is Telegram-only by design.

---

## Architecture

```
┌──────────────────┐   webhook / polling    ┌─────────────────────────────────────┐
│  Telegram        │ ─────────────────────► │  Express (src/index.ts)             │
│  (Chat SDK)      │                        │  • GET /health                      │
└──────────────────┘                        │  • POST /api/chat (debug / load test) │
                                            │  • ingress → debounce → agent       │
┌──────────────────┐   optional local       └──────────────────┬──────────────────┘
│  public/         │   POST /api/chat                          │
│  index.html      │ ────────────────────────────────────────────┤
└──────────────────┘                                             ▼
                                        ┌─────────────────────────────────────┐
                                        │  src/agent.ts                       │
                                        │  streamText + tools + Vertex        │
                                        └──────────────────┬──────────────────┘
                                                           │
         ┌─────────────────────────────┬───────────────────┼───────────────────┐
         ▼                             ▼                   ▼                   ▼
  src/tools/*.ts              src/prompts/system.ts   src/memory.ts      OUTDOZE_API_BASE_URL
  Supermemory (doze project)  (persona + tools)     (supermemory pkg)   staging HTTP JSON
```

### Express app structure (target)

| Path | Purpose |
|------|---------|
| `src/index.ts` | Express app, Telegram bot init, debouncer/session handler (trimmed from doze), optional static `public/`. |
| `src/routes/chat.ts` | `POST /api/chat` — same contract as doze for local UI / tests. |
| `src/agent.ts` | `runAgentTurn` — port from `doze/src/agent.ts`. |
| `src/ingress/telegram-adapter.ts` | Map Telegram payloads → `IncomingChatMessage`. |
| `src/env.ts` | Load `.env` / `.env.local` locally only. |
| `src/memory.ts` | **Supermemory** — same API key / project as doze (`SUPERMEMORY_API_KEY`). |
| `src/tools/outdoze-client.ts` | `fetch` wrapper for staging Outdoze routes (see outdoze `todo.md`). |
| `public/index.html` | Optional browser chat for dev. |

**Chat contract:** Same as doze — `AgentChatRequest` / `AgentChatResponse` in `src/types.ts`.

---

## Outdoze API integration

- **Environment:** `OUTDOZE_API_BASE_URL` → **staging** deployment (placeholder until Vercel preview URL is pinned), e.g. `https://<staging-host>` — **not** production `https://outdoze.com` for demo traffic.
- **Auth:** v0 mock routes on Outdoze repo are public GET JSON; add `OUTDOZE_API_KEY` only if staging later requires it.
- **Agent tool:** `searchOutdoze` (alias `browseOutdoze` in docs) — HTTP client that calls Outdoze App Router handlers; returns place lists, place detail, and checkout summary JSON for the model. **No** Stagehand sessions.
- **Implementation tracker:** Private repo `bernoullithedev/outdoze` — see **`todo.md`** there for mock routes to add or stabilize for doze-test.

Existing Outdoze code reference: `app/api/places/route.ts` + `lib/mockData.ts` (`fetchPlaces` pagination).

---


## Vapi booking calls

When Outdoze returns a **`phone`** (or **`bookingPhone`**) on place detail / checkout-options, the agent can complete a reservation by voice instead of browser checkout.

**Flow:**

1. User asks to book or reserve → **`searchOutdoze`** (search → detail → optional `checkout-options`).
2. Response includes venue **`phone`** / **`bookingPhone`** (from staging mock API — see outdoze `TODO.md`).
3. Agent summarizes slot/party size and **asks user to confirm** before calling (Telegram).
4. On confirm → **`makePhoneCall`** (`doze/src/tools/make-call.ts`): passes `phoneNumber` (venue, for context), `purpose`, and brief `questions[]`.
5. **`vapi-client.ts`** creates outbound call via Vapi REST API, polls until `ended`, filters transcript (regex + optional Claude Haiku), returns essential booking info to the user in chat.

**Reference implementation:** private **`bernoullithedev/doze`** — `src/tools/make-call.ts`, `src/vapi-client.ts`, exported as **`makePhoneCall`** in `src/tools/index.ts`. Sunday monorepo `services/agent` has a parallel copy for MCP patterns only.

**Demo / safety:** doze hardcodes the **dialed** number to a test recipient (`+19095069035` in `vapi-client.ts`); `phoneNumber` tool arg is context for the model. Without env vars, tool runs in **stub mode** (returns what it would ask).

**System prompt:** Instruct agent to prefer phone booking when Outdoze exposes a number and user wants a human reservation; never call without explicit user confirmation.


## Tool roster (v0)

Register incrementally in `src/tools/index.ts` (one commit per tool where possible).

### Practical (from doze)

| Tool | Source | Behavior |
|------|--------|----------|
| **`saveMemory`** | `doze/src/tools/save-memory.ts` | Supermemory via `src/memory.ts`, **same project/API key as doze**. |
| **`searchMemory`** | `doze/src/tools/search-memory.ts` | Supermemory search scoped by sender tag. |
| **`manageList`** | `doze/src/tools/manage-list.ts` | In-memory or persisted list CRUD per sender. |
| **`searchProducts`** | `doze/src/tools/search-products.ts` | Perplexity Sonar — **kept**; general web/product research when Outdoze does not cover the question. |
| **`searchOutdoze`** | **New** (`outdoze-client.ts`) | Query staging Outdoze: search places, get place by id/slug, checkout/options mock. |
| **`makePhoneCall`** | `doze/src/tools/make-call.ts` + `doze/src/vapi-client.ts` | Outbound Vapi voice call for reservations; uses venue `phone` from Outdoze after user confirms. Stub if `VAPI_*` unset. |

### Fun (hackathon)

| Tool | Source / notes |
|------|----------------|
| **`generatePoster`** | `doze/src/tools/generate-poster.ts` |
| **`pickRestaurant`** | Curated list + dice / filters (can complement Outdoze results) |
| **`fortuneCookie`** | Lightweight stub |
| **`moodPlaylist`** | Stub playlist for mood string |
| **`roastOutfit`** | Multimodal via Gemini user content + attachments |

**Removed / not ported:** `suggestPlan` as primary demo path (optional later). No `browse-website`, `process-payment`, Partiful tools, `create-event-partiful`.

### Explicitly EXCLUDED

- `browse-website` / Stagehand / Browserbase  
- `browseAndCheckout` / DoorDash automation  
- Partiful event flows  
- `process-payment` / Stripe  
- Generic browse fallback when Outdoze + `searchProducts` suffice  

---

## What to copy from doze (copy map)

| doze path | doze-test |
|-----------|-----------|
| `src/agent.ts` | Agent loop, Vertex model env |
| `src/env.ts` | Env bootstrap |
| `src/types.ts` | Chat types |
| `src/memory.ts` | Supermemory client + sender tag |
| `src/tools/index.ts` | Tool registration |
| `src/tools/save-memory.ts`, `search-memory.ts`, `manage-list.ts`, `search-products.ts` | Core tools |
| `src/tools/generate-poster.ts` | Fun + attachments |
| `src/tools/make-call.ts` | `makePhoneCall` tool (booking intent) |
| `src/vapi-client.ts` | Vapi REST client, poll, transcript filter |
| `src/ingress/telegram-adapter.ts` | Telegram mapping |
| `src/ingress/spectrum-adapter.ts` | **Future** - not ported for hackathon (see ingress section). |
| `src/index.ts` | Trim to Telegram + Express routes; omit WhatsApp |
| `src/prompt/*`, `src/attachments.ts` | If multimodal / multi-bubble replies needed |
| `src/prompts/system.ts` | Shorten; document Outdoze + Telegram |

**Do not port:** `browse-website.ts`, `process-payment.ts`, `create-event-partiful.ts`, `spectrum-adapter.ts`, Spectrum/iMessage bootstrap.

**Sunday monorepo:** Reference only for bridge/agent MCP patterns — **not** ported for this repo.

---

## Commit farm guidelines

One conventional commit per logical change; keep `main` bisectable.

**Examples:**

```
docs: revise plan for doze port, telegram, outdoze API
feat(ingress): wire Telegram polling adapter
feat(tools): add searchOutdoze HTTP client
feat(memory): wire Supermemory same as doze
feat(tools): port searchProducts Perplexity
chore: document env in .env.example
```

**Do not** batch unrelated tools in a single commit during build night.

---

## Implementation phases

### Phase 0 — Docs & env

- [x] Public `doze-test` repo  
- [x] `plan.md` (this file)  
- [ ] `.env.example` aligned with env table  
- [ ] `README.md` run instructions (Telegram + optional UI)

### Phase 1 — Skeleton

- [ ] `package.json`, `tsconfig`, strict TS  
- [ ] `src/env.ts`, `src/index.ts`, `GET /health`  
- [ ] `src/types.ts`, stub `runAgentTurn`

### Phase 2 — Agent core

- [ ] Vertex in `src/agent.ts`  
- [ ] `src/prompts/system.ts`  
- [ ] Supermemory in `src/memory.ts` (doze-equivalent key)  
- [ ] `POST /api/chat` text-only E2E

### Phase 3 — Ingress

- [ ] Telegram adapter + Chat SDK polling  
- [ ] Session/debounce handler (minimal port from doze pipeline)  

### Phase 4 — Tools (one commit each)

- [ ] `saveMemory` + `searchMemory`  
- [ ] `manageList`  
- [ ] `searchProducts`  
- [ ] `searchOutdoze` (staging base URL)  
- [ ] `makePhoneCall` + `vapi-client` (port from doze; wire after Outdoze returns `phone`)  
- [ ] Fun tools: poster, pickRestaurant, fortuneCookie, moodPlaylist, roastOutfit

### Phase 4b — Vapi booking

- [ ] Port `make-call.ts` + `vapi-client.ts` from doze  
- [ ] Register `makePhoneCall` in `src/tools/index.ts`  
- [ ] Document confirm-before-call in `src/prompts/system.ts`  
- [ ] Smoke: stub mode without `VAPI_*`; optional live call with keys  
- [ ] E2E: `searchOutdoze` → detail with `phone` → user confirms → call → summary in Telegram  

### Phase 5 — Outdoze staging

- [ ] Pin `OUTDOZE_API_BASE_URL` to staging deploy  
- [ ] Verify against outdoze `todo.md` mock routes  
- [ ] Rehearse Telegram demo script

### Phase 6 — Hardening

- [ ] `pnpm typecheck` clean  
- [ ] Friendly agent error fallback  
- [ ] No secrets in git

---

## Environment variables

Secrets live in **`.env.local`** (gitignored) and optionally `.env` for local overrides. Document placeholders in **`.env.example`** only.

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_VERTEX_API_KEY` | Yes | Vertex / Gemini via `@ai-sdk/google-vertex` |
| `VERTEX_MODEL` | Optional | Default e.g. `gemini-2.0-flash` or team preview id |
| `SERVER_PORT` | Optional | Default `4000` |
| `TELEGRAM_BOT_TOKEN` | Yes (demo) | From @BotFather |
| `SUPERMEMORY_API_KEY` | Yes | **Same key / project as doze** |
| `PERPLEXITY_API_KEY` | Yes | For `searchProducts` |
| `OUTDOZE_API_BASE_URL` | Yes | **Staging** base URL (no trailing slash); not prod marketing site |
| `OUTDOZE_API_KEY` | Optional | If staging routes add auth |
| `ARTIFACT_DIR` | Optional | Poster output, default `/tmp/doze-test-artifacts` |
| `VAPI_API_KEY` | Optional (live calls) | Vapi dashboard API key; omit for stub mode |
| `VAPI_PHONE_NUMBER_ID` | Optional (live calls) | Vapi outbound number ID paired with `VAPI_API_KEY` |
| `ANTHROPIC_API_KEY` | Optional | Used by `vapi-client` intelligent transcript filter (Haiku); regex fallback works without it |

Never commit `.env`, `.env.local`, or API keys.

---

## Telegram demo script (~60s)

1. **Open** Telegram bot — introduce Doze-test concierge.  
2. **Say:** “Remember my name is Alex and I hate crowded spots.” → **`saveMemory`**.  
3. **Ask:** “Add sunscreen to my beach list.” → **`manageList`**.  
4. **Ask:** “Find rooftop lounges in Accra under ₵200” → **`searchOutdoze`** (staging).  
4b. **Ask:** "Book Afrikiko Saturday 7pm, party of 2" → detail/`checkout-options` shows **`phone`** → agent confirms → **`makePhoneCall`** → booking summary in chat (stub or live Vapi).  
5. **Ask:** “What’s trending for date night restaurants in East Legon?” → **`searchProducts`** if Outdoze slice is thin.  
6. **Ask:** “We can’t pick dinner — surprise us, Japanese vibe.” → **`pickRestaurant`**.  
7. **Ask:** “Poster for ‘Outdoze Night’ neon vibe.” → **`generatePoster`**, send image in chat.  
8. **Photo +** “Roast my fit.” → **`roastOutfit`**.  
9. **Close:** “Fortune cookie?” → **`fortuneCookie`**.

Backup: **`moodPlaylist`**, local `POST /api/chat` UI if Telegram flakes.

---

## Risks & gotchas

| Risk | Mitigation |
|------|------------|
| Staging URL not ready | Ship `searchOutdoze` with clear error text; use `searchProducts` fallback in prompt |
| Telegram polling conflicts | Single bot token; don’t run doze + doze-test against same token simultaneously |
| Supermemory quota | Same project as doze — monitor usage |
| Accidental prod Outdoze | Code review `OUTDOZE_API_BASE_URL`; block prod host in dev guard optional |
| Vertex model id drift | Pin `VERTEX_MODEL` in `.env.local` |

---

## Success criteria

- Telegram ingress delivers messages to `runAgentTurn` and replies in-thread.  
- Core tools + Outdoze HTTP tool demonstrably invoked in demo.  
- Optional demo beat: Outdoze `phone` → confirmed **`makePhoneCall`** (stub or Vapi).  
- Supermemory reads/writes use **doze’s** Supermemory project.  
- Commit farm history shows incremental features.  
- No secrets in git; Telegram-only ingress defines “done.” for v0.

---

## Open questions

1. **Exact staging hostname:** Replace placeholder in `OUTDOZE_API_BASE_URL` when Vercel preview / staging deploy is chosen.  
2. **Outdoze mock routes:** See `bernoullithedev/outdoze` **`todo.md`** — implement `GET /api/places/search`, detail, checkout mock if not already stable on staging branch.

---

*Last updated: Telegram-only ingress; Spectrum out of scope; Outdoze staging HTTP + booking phone; Vapi `makePhoneCall` in scope; Supermemory shared with doze; browse disabled; Perplexity search kept.*
