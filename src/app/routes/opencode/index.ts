import { Hono } from "hono";
import chatRouter from "./chat.ts";
import healthRouter from "./health.ts";

const router = new Hono();

router.route("/chat", chatRouter);
router.route("/health", healthRouter);

export default router;
