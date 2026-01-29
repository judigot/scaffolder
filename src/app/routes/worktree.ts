import { Hono } from "hono";
import { cors } from "hono/cors";
import { getLocalRepoFiles } from "@/app/services/localRepoService.ts";
import {
	addMessageToMetadata,
	createWorktree,
	deleteWorktree,
	listWorktrees,
	scanWorktreeChats,
	validateWorktree,
	validateWorktreeResult,
} from "@/app/services/worktreeService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

interface ICreateWorktreePayload {
	repoPath?: unknown;
	chatId?: unknown;
	branchName?: unknown;
}

interface IWorktreePathPayload {
	worktreePath?: unknown;
}

interface IValidateResultPayload extends IWorktreePathPayload {
	commitCountBefore?: unknown;
}

interface IListWorktreesPayload {
	repoPath?: unknown;
}

const app = new Hono();
app.use("*", cors());

/**
 * Create a new worktree for a chat
 * POST /api/worktree/create
 */
app.post("/create", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: ICreateWorktreePayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.repoPath !== "string" || body.repoPath.trim() === "") {
		return c.json({ error: "repoPath is required" }, 400);
	}

	if (typeof body.chatId !== "string" || body.chatId.trim() === "") {
		return c.json({ error: "chatId is required" }, 400);
	}

	const branchName =
		typeof body.branchName === "string" && body.branchName.trim() !== ""
			? body.branchName.trim()
			: undefined;

	try {
		const result = await createWorktree(
			body.repoPath.trim(),
			body.chatId.trim(),
			branchName,
		);
		return c.json({ ok: true, ...result });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create worktree";
		return c.json({ ok: false, error: message }, 500);
	}
});

/**
 * Validate a worktree before agent execution (pre-flight)
 * POST /api/worktree/validate
 */
app.post("/validate", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IWorktreePathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (
		typeof body.worktreePath !== "string" ||
		body.worktreePath.trim() === ""
	) {
		return c.json({ error: "worktreePath is required" }, 400);
	}

	try {
		const result = await validateWorktree(body.worktreePath.trim());
		return c.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to validate worktree";
		return c.json({ valid: false, error: message }, 500);
	}
});

/**
 * Validate worktree after agent execution (post-flight)
 * POST /api/worktree/validate-result
 */
app.post("/validate-result", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IValidateResultPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (
		typeof body.worktreePath !== "string" ||
		body.worktreePath.trim() === ""
	) {
		return c.json({ error: "worktreePath is required" }, 400);
	}

	const commitCountBefore =
		typeof body.commitCountBefore === "number" ? body.commitCountBefore : 0;

	try {
		const result = await validateWorktreeResult(
			body.worktreePath.trim(),
			commitCountBefore,
		);
		return c.json(result);
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to validate worktree result";
		return c.json({ valid: false, error: message }, 500);
	}
});

/**
 * Get files from a worktree
 * POST /api/worktree/files
 */
app.post("/files", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IWorktreePathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (
		typeof body.worktreePath !== "string" ||
		body.worktreePath.trim() === ""
	) {
		return c.json({ error: "worktreePath is required" }, 400);
	}

	try {
		const files = await getLocalRepoFiles(body.worktreePath.trim());
		return c.json({ ok: true, files });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to read worktree files";
		return c.json({ ok: false, error: message }, 500);
	}
});

/**
 * List all worktrees for a repository
 * POST /api/worktree/list
 */
app.post("/list", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IListWorktreesPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.repoPath !== "string" || body.repoPath.trim() === "") {
		return c.json({ error: "repoPath is required" }, 400);
	}

	try {
		const worktrees = await listWorktrees(body.repoPath.trim());
		return c.json({ ok: true, worktrees });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to list worktrees";
		return c.json({ ok: false, error: message }, 500);
	}
});

/**
 * Delete a worktree
 * POST /api/worktree/delete
 */
app.post("/delete", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IWorktreePathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (
		typeof body.worktreePath !== "string" ||
		body.worktreePath.trim() === ""
	) {
		return c.json({ error: "worktreePath is required" }, 400);
	}

	try {
		await deleteWorktree(body.worktreePath.trim());
		return c.json({ ok: true });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete worktree";
		return c.json({ ok: false, error: message }, 500);
	}
});

/**
 * Scan worktrees and return all chats
 * POST /api/worktree/scan-chats
 */
app.post("/scan-chats", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: { repoPath?: unknown };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.repoPath !== "string" || body.repoPath.trim() === "") {
		return c.json({ error: "repoPath is required" }, 400);
	}

	try {
		const chats = await scanWorktreeChats(body.repoPath.trim());
		return c.json({ ok: true, chats });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to scan chats";
		return c.json({ ok: false, error: message }, 500);
	}
});

/**
 * Add a message to chat metadata
 * POST /api/worktree/add-message
 */
app.post("/add-message", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: {
		worktreePath?: unknown;
		message?: unknown;
	};
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (
		typeof body.worktreePath !== "string" ||
		body.worktreePath.trim() === ""
	) {
		return c.json({ error: "worktreePath is required" }, 400);
	}

	if (typeof body.message !== "object" || body.message === null) {
		return c.json({ error: "message is required" }, 400);
	}

	// eslint-disable-next-line no-type-assertion/no-type-assertion -- Safe after type guard
	const msgObj: Record<string, unknown> = body.message as Record<
		string,
		unknown
	>;
	const msgId = msgObj.id;
	const msgRole = msgObj.role;
	const msgContent = msgObj.content;
	const msgTimestamp = msgObj.timestamp;

	if (
		typeof msgId !== "string" ||
		typeof msgRole !== "string" ||
		typeof msgContent !== "string" ||
		typeof msgTimestamp !== "string"
	) {
		return c.json({ error: "Invalid message format" }, 400);
	}

	if (msgRole !== "user" && msgRole !== "assistant") {
		return c.json({ error: "Invalid message role" }, 400);
	}

	try {
		await addMessageToMetadata(body.worktreePath.trim(), {
			id: msgId,
			role: msgRole,
			content: msgContent,
			timestamp: msgTimestamp,
		});
		return c.json({ ok: true });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Failed to add message";
		return c.json({ ok: false, error: errorMessage }, 500);
	}
});

export default app;
