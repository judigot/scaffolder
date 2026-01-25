/**
 * Terminal API - Direct SSH Command Execution
 *
 * This endpoint executes commands directly on remote servers via SSH
 * without going through AI interpretation. It's designed for the
 * Terminal Mode feature.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	connectToInstance,
	disconnect,
	executeCommand,
} from "@/app/services/sshService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

interface ITerminalExecutePayload {
	command?: unknown;
	workingDirectory?: unknown;
	infraCredentials?: {
		sshPrivateKey?: unknown;
		host?: unknown;
	};
}

const app = new Hono();

app.use("*", cors());

/**
 * Execute a command directly on the remote server
 * POST /terminal/execute
 */
app.post("/execute", async (c) => {
	// Verify authentication
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	// Parse request body
	let body: ITerminalExecutePayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	// Validate command
	if (typeof body.command !== "string" || body.command.trim() === "") {
		return c.json({ error: "Command is required" }, 400);
	}

	// Validate credentials
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

	const command = body.command;
	const workingDirectory = typeof body.workingDirectory === "string"
		? body.workingDirectory
		: undefined;

	// Connect via SSH
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

	// Execute command
	try {
		const fullCommand = workingDirectory
			? `cd ${workingDirectory} && ${command}`
			: command;

		const result = await executeCommand(client, fullCommand);

		// Disconnect after command
		disconnect(client);

		// Return result
		return c.json({
			success: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: result.stdout || "",
			stderr: result.stderr || "",
		});
	} catch (err: unknown) {
		disconnect(client);
		const errorMessage =
			err instanceof Error ? err.message : "Command execution failed";
		return c.json(
			{
				success: false,
				error: errorMessage,
				stdout: "",
				stderr: errorMessage,
			},
			500,
		);
	}
});

export default app;
