import "./env.js";
import express from "express";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import { loadServerConfig } from "./config.js";
import { MessageDebouncer } from "./pipeline/debouncer.js";
import {
  enqueueByChat,
  isDuplicateMessage,
  pruneSeenMessages,
} from "./pipeline/pipeline-utils.js";
import { telegramMessageToIncoming } from "./ingress/telegram-adapter.js";
import { createBatchHandler } from "./session/handler.js";
import type { SessionState, DeliveryTarget } from "./session/handler.js";
import { chatRouter } from "./routes/chat.js";

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 4000;
const config = loadServerConfig();

const sessions = new Map<string, SessionState>();
const deliveryTargets = new Map<string, DeliveryTarget>();
const perChatQueues = new Map<string, Promise<void>>();
const seenMessages = new Map<string, number>();

const handleBatch = createBatchHandler({ sessions, deliveryTargets });

const debouncer = new MessageDebouncer(config.debounceWindowMs, async (batch) => {
  await enqueueByChat(perChatQueues, batch.chatGuid, async () => {
    await handleBatch(batch);
  });
});

function trackInboundMessage(messageGuid: string | undefined): boolean {
  if (!messageGuid) {
    return false;
  }
  const nowMs = Date.now();
  const duplicate = isDuplicateMessage(
    seenMessages,
    messageGuid,
    nowMs,
    config.dedupeWindowMs
  );
  if (seenMessages.size >= 2000) {
    pruneSeenMessages(seenMessages, nowMs, config.dedupeWindowMs);
  }
  return duplicate;
}

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/chat", chatRouter);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(projectRoot, "public");

if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

if (telegramToken) {
  const chatSdkBot = new Chat({
    userName: "Doze",
    adapters: {
      telegram: createTelegramAdapter({
        mode: "polling",
      }),
    },
    state: createMemoryState(),
  });

  void chatSdkBot.initialize();

  chatSdkBot.onDirectMessage(async (thread, message) => {
    try {
      await thread.subscribe();
      const userId = message.author?.userId || "chat-user";
      const incoming = telegramMessageToIncoming({
        text: message.text,
        userId,
        messageId: message.id,
      });

      if (trackInboundMessage(incoming.messageGuid)) {
        return;
      }

      deliveryTargets.set(incoming.chatGuid, { kind: "telegram", thread });
      debouncer.push(incoming);
    } catch (err) {
      console.error("[chat-sdk] Error handling message:", err);
    }
  });

  if (chatSdkBot.webhooks.telegram) {
    app.use(
      "/api/telegram",
      chatSdkBot.webhooks.telegram as unknown as express.RequestHandler
    );
  }

  console.log("[server] Telegram polling enabled.");
} else {
  console.log("[server] TELEGRAM_BOT_TOKEN unset — Telegram ingress disabled.");
}

app.listen(PORT, () => {
  console.log(`[server] Express running on http://localhost:${PORT}`);
  console.log(`[server] POST /api/chat ready for local debug`);
});

export { app };
