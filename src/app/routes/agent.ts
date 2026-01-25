import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteAgentTools } from "@/app/services/remoteAgentTools.ts";
import {
	connectToInstance,
	disconnect,
} from "@/app/services/sshService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

const REMOTE_AGENT_SYSTEM_PROMPT = `You are a remote coding agent with SSH access to a Linux server. You can execute commands, read/write files, and manage projects on the remote instance.

Guidelines:
- Be concise and direct in your responses
- Always verify your changes work by checking command output
- Use absolute paths when possible
- If a command fails, read the error and try an alternative approach
- Never expose or log private keys or sensitive credentials
- You are running as the default EC2 user (not root) — use sudo when needed for system-level operations
- For long-running processes, suggest running them in the background with nohup or tmux
- When creating files, ensure parent directories exist first`;

interface IAgentChatPayload {
	messages?: unknown;
	infraCredentials?: {
		sshPrivateKey?: unknown;
		host?: unknown;
	};
}

const app = new Hono();

app.use("*", cors());

app.post("/chat", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IAgentChatPayload;
	try {
		body = (await c.req.json());
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (!Array.isArray(body.messages)) {
		return c.json({ error: "Invalid messages format" }, 400);
	}

	const credentials = body.infraCredentials;
	if (
		!credentials ||
		typeof credentials.sshPrivateKey !== "string" ||
		credentials.sshPrivateKey.trim() === "" ||
		typeof credentials.host !== "string" ||
		credentials.host.trim() === ""
	) {
		return c.json(
			{
				error: "Missing credentials",
				message: "SSH private key and host are required",
			},
			400,
		);
	}

	const { sshPrivateKey, host } = credentials as {
		sshPrivateKey: string;
		host: string;
	};

	let client;
	try {
		client = await connectToInstance({
			host,
			privateKey: sshPrivateKey,
		});
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Failed to connect via SSH";
		return c.json({ error: "SSH connection failed", message }, 502);
	}

	try {
		const convertedMessages = await convertToModelMessages(
			body.messages as Parameters<typeof convertToModelMessages>[0],
		);

		const tools = createRemoteAgentTools(client);

		const result = streamText({
			model: openai("gpt-5-nano"),
			system: REMOTE_AGENT_SYSTEM_PROMPT,
			messages: convertedMessages,
			tools,
			stopWhen: stepCountIs(20),
			onFinish: () => {
				disconnect(client);
			},
		});

		return result.toUIMessageStreamResponse();
	} catch (err: unknown) {
		disconnect(client);
		console.error("Agent chat error:", err);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default app;
