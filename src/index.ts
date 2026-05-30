import "./env.js";
import express from "express";
import { chatRouter } from "./routes/chat.js";

const app = express();
const PORT = process.env.SERVER_PORT ?? "4000";

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`[server] Express running on http://localhost:${PORT}`);
  console.log(`[server] POST /api/chat ready for local debug`);
});
