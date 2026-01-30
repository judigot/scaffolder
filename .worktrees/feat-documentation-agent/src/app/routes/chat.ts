import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { SCHEMA_BUILDER_SYSTEM_PROMPT } from "@/prompts/index.ts";

// Model configuration
type ModelId = "gpt-5-nano" | "gpt-5-mini" | "gpt-5.2-codex" | "claude-sonnet-4.5" | "claude-opus-4.5";

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

		// Get model from request, default to gpt-5-nano
		const modelId: ModelId = isValidModelId(body.model) ? body.model : "gpt-5-nano";

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const convertedMessages = await convertToModelMessages(body.messages);

		const result = streamText({
			model: getModel(modelId),
			system: SCHEMA_BUILDER_SYSTEM_PROMPT,
			messages: convertedMessages,
			temperature: 0.7,
		});

		return result.toUIMessageStreamResponse();
	} catch (error) {
		console.error("Chat API error:", error);
		return c.json({ error: "Internal server error" }, 500);
	}
});

export default app;
