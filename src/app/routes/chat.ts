import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SCHEMA_BUILDER_SYSTEM_PROMPT } from "@/prompts/index.ts";

// Model configuration
type ModelId =
	| "gpt-5-nano"
	| "gpt-5-mini"
	| "gpt-5.2-codex"
	| "claude-sonnet-4.5"
	| "claude-opus-4.5";

interface IModelConfig {
	id: ModelId;
	name: string;
	provider: "openai" | "anthropic";
	modelString: string;
}

const MODEL_CONFIGS: Record<ModelId, IModelConfig> = {
	"gpt-5-nano": {
		id: "gpt-5-nano",
		name: "GPT-5 Nano",
		provider: "openai",
		modelString: "gpt-5-nano",
	},
	"gpt-5-mini": {
		id: "gpt-5-mini",
		name: "GPT-5 Mini",
		provider: "openai",
		modelString: "gpt-5-mini",
	},
	"gpt-5.2-codex": {
		id: "gpt-5.2-codex",
		name: "GPT-5.2 Codex",
		provider: "openai",
		modelString: "gpt-5.2-codex",
	},
	"claude-sonnet-4.5": {
		id: "claude-sonnet-4.5",
		name: "Claude Sonnet 4.5",
		provider: "anthropic",
		modelString: "claude-sonnet-4-5-20250929",
	},
	"claude-opus-4.5": {
		id: "claude-opus-4.5",
		name: "Claude Opus 4.5",
		provider: "anthropic",
		modelString: "claude-opus-4-5-20251101",
	},
};

const getModel = (modelId: ModelId) => {
	const config = MODEL_CONFIGS[modelId];
	if (config.provider === "anthropic") {
		return anthropic(config.modelString);
	}
	return openai(config.modelString);
};

const isValidModelId = (id: unknown): id is ModelId => {
	return typeof id === "string" && id in MODEL_CONFIGS;
};

/**
 * Type guard to check if value is a Record with string keys
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};

/**
 * Type guard to validate if a value is a valid UIMessage object
 */
const isValidUIMessage = (msg: unknown): msg is Omit<UIMessage, "id"> => {
	if (!isRecord(msg)) {
		return false;
	}

	// Check role - required field
	if (typeof msg.role !== "string") {
		return false;
	}

	const validRoles = ["system", "user", "assistant"];
	if (!validRoles.includes(msg.role)) {
		return false;
	}

	// Check parts - required field
	if (!Array.isArray(msg.parts)) {
		return false;
	}

	// Validate each part has at least a type property
	for (const part of msg.parts) {
		if (!isRecord(part)) {
			return false;
		}
		if (typeof part.type !== "string") {
			return false;
		}
	}

	return true;
};

const app = new Hono();

app.use("*", cors());

// Get available models
app.get("/models", (c) => {
	const models = Object.values(MODEL_CONFIGS).map((config) => ({
		id: config.id,
		name: config.name,
		provider: config.provider,
	}));
	return c.json({ models });
});

app.post("/", async (c) => {
	try {
		const body: unknown = await c.req.json();

		if (typeof body !== "object" || body === null || !("messages" in body)) {
			return c.json({ error: "Invalid request body" }, 400);
		}

		interface IRequestBody {
			messages: unknown;
			model?: unknown;
		}

		function isRequestBody(obj: object): obj is IRequestBody {
			return "messages" in obj;
		}

		if (!isRequestBody(body)) {
			return c.json({ error: "Invalid request body" }, 400);
		}

		if (!Array.isArray(body.messages)) {
			return c.json({ error: "Invalid messages format" }, 400);
		}

		// Validate each message is a valid UIMessage
		if (!body.messages.every(isValidUIMessage)) {
			return c.json({ error: "Invalid message structure" }, 400);
		}

		// Get model from request, default to gpt-5-nano
		const modelId: ModelId = isValidModelId(body.model)
			? body.model
			: "gpt-5-nano";

		const convertedMessages = await convertToModelMessages(body.messages);

		// Build streamText options - reasoning models like gpt-5.2-codex don't support temperature
		const baseOptions = {
			model: getModel(modelId),
			system: SCHEMA_BUILDER_SYSTEM_PROMPT,
			messages: convertedMessages,
		};

		// Only add temperature for non-reasoning models
		if (modelId !== "gpt-5.2-codex") {
			const optionsWithTemp = {
				...baseOptions,
				temperature: 0.7,
			};
			const result = streamText(optionsWithTemp);
			return result.toUIMessageStreamResponse();
		}

		const result = streamText(baseOptions);

		return result.toUIMessageStreamResponse();
	} catch (error) {
		console.error("Chat API error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default app;
