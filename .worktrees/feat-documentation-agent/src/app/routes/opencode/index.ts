import { Hono } from "hono";
import chatRouter from "./chat.ts";
import healthRouter from "./health.ts";
import streamRouter from "./stream.ts";

const router = new Hono();

router.route("/chat", chatRouter);
router.route("/chat/stream", streamRouter);
router.route("/health", healthRouter);

export default router;
