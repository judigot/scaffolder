import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRepoAgentTools } from "@/app/services/repoAgentTools.ts";
import {
	getGitHubAppConfig,
	getGitHubAppOctokit,
} from "@/app/services/githubAppService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

const REPO_AGENT_SYSTEM_PROMPT = `Repository agent with GitHub access.

## MANDATORY Workflow (execute ALL steps)
1. create_branch → scaffolder/<descriptive-name>
2. write_file → create/modify files on that branch
3. create_pull_request → ALWAYS create PR after changes

NEVER skip step 3. Every change MUST result in a PR.

## Rules
- Branch naming: scaffolder/<feature-name>
- NEVER commit to main/master
- PR title: concise description of change
- PR body: bullet list of what changed

## Response Format
After ALL steps complete:
"Done. Branch: [name]. Files: [list]. PR: [url]"

Keep under 30 words. No explanations.`;

// Model configurations
const MODEL_CONFIGS = {
	"gpt-5-nano": { provider: "openai", modelId: "gpt-4.1-nano" },
	"gpt-5-mini": { provider: "openai", modelId: "gpt-4.1-mini" },
	"gpt-5.2-codex": { provider: "openai", modelId: "o3" },
	"claude-sonnet-4.5": { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
	"claude-opus-4.5": { provider: "anthropic", modelId: "claude-opus-4-20250514" },
} as const;

type ModelId = keyof typeof MODEL_CONFIGS;

function isValidModelId(id: unknown): id is ModelId {
	return typeof id === "string" && id in MODEL_CONFIGS;
}

interface IRepoAgentPayload {
	messages?: unknown;
	repoUrl?: string;
	model?: string;
}

interface ISimpleMessage {
	role: string;
	content: string;
}

interface IUIMessage {
	id?: string;
	role: "system" | "user" | "assistant";
	parts: { type: "text"; text: string }[];
}

/**
 * Convert simple { role, content } messages to UIMessage format with parts
 */
function convertToUIMessages(messages: unknown[]): IUIMessage[] {
	return messages.map((msg, index) => {
		// Check if it's already in UIMessage format (has parts)
		if (
			typeof msg === "object" &&
			msg !== null &&
			"parts" in msg &&
			Array.isArray((msg as { parts: unknown }).parts)
		) {
			return msg as IUIMessage;
		}

		// Convert simple { role, content } format
		const simpleMsg = msg as ISimpleMessage;
		const role = simpleMsg.role === "user" ? "user" : simpleMsg.role === "system" ? "system" : "assistant";
		
		return {
			id: `msg-${String(index)}`,
			role,
			parts: [{ type: "text" as const, text: simpleMsg.content ?? "" }],
		};
	});
}

function parseGitHubURL(url: string): { owner: string; repo: string } | null {
	try {
		const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
		const match = githubRegex.exec(url);

		if (match?.length === 3 && match[1] !== undefined && match[2] !== undefined) {
			return {
				owner: match[1],
				repo: match[2].replace(/\.git$/, ""),
			};
		}
		return null;
	} catch {
		return null;
	}
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

	let body: IRepoAgentPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (!Array.isArray(body.messages)) {
		return c.json({ error: "Invalid messages format" }, 400);
	}

	if (typeof body.repoUrl !== "string" || body.repoUrl.trim() === "") {
		return c.json({ error: "Repository URL is required" }, 400);
	}

	const repoInfo = parseGitHubURL(body.repoUrl);
	if (repoInfo === null) {
		return c.json({ error: "Invalid GitHub repository URL" }, 400);
	}

	// Get GitHub App configuration
	const appConfig = getGitHubAppConfig();
	if (appConfig === null) {
		return c.json(
			{
				error: "GitHub App not configured",
				message: "Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables",
			},
			500,
		);
	}

	// Get authenticated Octokit instance
	let octokit: Awaited<ReturnType<typeof getGitHubAppOctokit>>;
	try {
		octokit = await getGitHubAppOctokit(appConfig, {
			owner: repoInfo.owner,
			repo: repoInfo.repo,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Failed to authenticate with GitHub";
		return c.json({ error: "GitHub authentication failed", message }, 502);
	}

	// Get the default branch
	let baseBranch = "main";
	try {
		const repoData = await octokit.repos.get({
			owner: repoInfo.owner,
			repo: repoInfo.repo,
		});
		baseBranch = repoData.data.default_branch;
	} catch (err: unknown) {
		console.warn("[RepoAgent] Could not fetch default branch, using 'main':", err);
	}

	// Determine which model to use
	const modelId = isValidModelId(body.model) ? body.model : "gpt-5-nano";
	const modelConfig = MODEL_CONFIGS[modelId];

	const model =
		modelConfig.provider === "openai"
			? openai(modelConfig.modelId)
			: anthropic(modelConfig.modelId);

	try {
		console.log("[RepoAgent] Converting messages...");
		// First convert simple messages to UIMessage format, then to ModelMessages
		const uiMessages = convertToUIMessages(body.messages as unknown[]);
		const convertedMessages = await convertToModelMessages(uiMessages);
		console.log("[RepoAgent] Messages converted:", convertedMessages.length);

		console.log("[RepoAgent] Creating repo agent tools...");
		const tools = createRepoAgentTools(octokit, {
			owner: repoInfo.owner,
			repo: repoInfo.repo,
			baseBranch,
		});
		console.log("[RepoAgent] Tools created");

		// Add repository context to system prompt
		const contextualPrompt = `${REPO_AGENT_SYSTEM_PROMPT}

## Current Repository Context
- Repository: ${repoInfo.owner}/${repoInfo.repo}
- Base branch: ${baseBranch}
- All changes will be committed to scaffolder/* branches`;

		console.log("[RepoAgent] Starting streamText with model:", modelId);
		const result = streamText({
			model,
			system: contextualPrompt,
			messages: convertedMessages,
			tools,
			stopWhen: stepCountIs(20),
		});

		console.log("[RepoAgent] Returning stream response...");
		return result.toUIMessageStreamResponse();
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : undefined;
		console.error("[RepoAgent] Error:", errorMessage);
		console.error("[RepoAgent] Stack:", errorStack);
		return c.json(
			{ error: "Internal server error", details: errorMessage },
			500,
		);
	}
});

export default app;
