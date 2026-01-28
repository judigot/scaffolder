import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteAgentTools } from "@/app/services/remoteAgentTools.ts";
import type { ISSHConnection } from "@/app/services/sshService.ts";
import { connectToInstance, disconnect } from "@/app/services/sshService.ts";
import { REMOTE_AGENT_SYSTEM_PROMPT } from "@/prompts/index.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

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
		body = await c.req.json();
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

	let client: ISSHConnection;
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
		console.log("[Agent] Converting messages...");
		const convertedMessages = await convertToModelMessages(
			body.messages as Parameters<typeof convertToModelMessages>[0],
		);
		console.log("[Agent] Messages converted:", convertedMessages.length);

		console.log("[Agent] Creating remote agent tools...");
		const tools = createRemoteAgentTools(client);
		console.log("[Agent] Tools created");

		console.log("[Agent] Starting streamText...");
		const result = streamText({
			model: openai("gpt-5-nano"),
			system: REMOTE_AGENT_SYSTEM_PROMPT,
			messages: convertedMessages,
			tools,
			stopWhen: stepCountIs(20),
			onFinish: () => {
				console.log("[Agent] Stream finished, disconnecting...");
				void disconnect(client);
			},
		});

		console.log("[Agent] Returning stream response...");
		return result.toUIMessageStreamResponse();
	} catch (err: unknown) {
		await disconnect(client);
		const errorMessage = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : undefined;
		console.error("[Agent] Error:", errorMessage);
		console.error("[Agent] Stack:", errorStack);
		return c.json(
			{ error: "Internal server error", details: errorMessage },
			500,
		);
	}
});

export default app;
