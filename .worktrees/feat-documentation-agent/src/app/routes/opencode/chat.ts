import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	buildOpencodeHeaders,
	getOpencodeConfig,
} from "@/app/services/opencodeService.ts";

interface IOpenCodeChatPayload {
	message?: unknown;
	sessionId?: unknown;
	directory?: unknown;
	systemPrompt?: unknown;
}

interface IOpenCodePart {
	type: string;
	text?: string;
}

const app = new Hono();

app.use("*", cors());

async function createSession(
	baseUrl: string,
	headers: Headers,
): Promise<string> {
	const response = await fetch(new URL("/session", baseUrl).toString(), {
		method: "POST",
		headers,
		body: JSON.stringify({ title: "Scaffolder OpenCode" }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to create session (${response.status}): ${text}`);
	}

	const data = (await response.json()) as { id?: string };
	if (!data.id) {
		throw new Error("OpenCode session response missing id");
	}

	return data.id;
}

function extractAssistantText(parts: IOpenCodePart[] | undefined): string {
	if (!parts || parts.length === 0) {
		return "";
	}

	return parts
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text ?? "")
		.join("\n");
}

app.post("/", async (c) => {
	const configResult = getOpencodeConfig();
	if (!configResult.ok) {
		return c.json(
			{
				error: configResult.error,
			},
			{ status: configResult.status },
		);
	}

	let body: IOpenCodeChatPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.message !== "string" || body.message.trim() === "") {
		return c.json({ error: "Message is required" }, 400);
	}

	const directory =
		typeof body.directory === "string" ? body.directory : undefined;
	const systemPrompt =
		typeof body.systemPrompt === "string" ? body.systemPrompt : undefined;
	const headers = buildOpencodeHeaders(configResult.config, directory);
	const baseUrl = configResult.config.baseUrl;

	let sessionId =
		typeof body.sessionId === "string" ? body.sessionId : undefined;

	try {
		if (!sessionId) {
			sessionId = await createSession(baseUrl, headers);
		}

		const promptBody: {
			parts: { type: string; text: string }[];
			system?: string;
		} = {
			parts: [{ type: "text", text: body.message }],
		};

		if (systemPrompt) {
			promptBody.system = systemPrompt;
		}

		const promptResponse = await fetch(
			new URL(`/session/${sessionId}/message`, baseUrl).toString(),
			{
				method: "POST",
				headers,
				body: JSON.stringify(promptBody),
			},
		);

		if (!promptResponse.ok) {
			const text = await promptResponse.text();
			return c.json(
				{
					error: `OpenCode prompt failed (${promptResponse.status})`,
					details: text,
				},
				502,
			);
		}

		const data = (await promptResponse.json()) as { parts?: IOpenCodePart[] };
		const assistantText = extractAssistantText(data.parts);

		return c.json({
			sessionId,
			assistantText,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "OpenCode request failed";
		return c.json({ error: message }, 502);
	}
});

export default app;
