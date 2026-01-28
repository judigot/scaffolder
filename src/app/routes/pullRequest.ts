import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	createPullRequest,
	getPRForBranch,
} from "@/app/services/githubPRService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

interface ICreatePRPayload {
	worktreePath?: unknown;
	branch?: unknown;
}

interface IGetPRPayload {
	repoPath?: unknown;
	branch?: unknown;
}

const app = new Hono();
app.use("*", cors());

/**
 * Create a GitHub PR for a branch
 * POST /api/pull-request/create
 */
app.post("/create", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: ICreatePRPayload;
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

	if (typeof body.branch !== "string" || body.branch.trim() === "") {
		return c.json({ error: "branch is required" }, 400);
	}

	try {
		const prInfo = await createPullRequest(
			body.worktreePath.trim(),
			body.branch.trim(),
			authResult.auth0UserId,
		);
		return c.json({ ok: true, ...prInfo });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to create PR";
		return c.json({ ok: false, error: message }, 500);
	}
});

/**
 * Get PR info for a branch (if exists)
 * POST /api/pull-request/get
 */
app.post("/get", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IGetPRPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.repoPath !== "string" || body.repoPath.trim() === "") {
		return c.json({ error: "repoPath is required" }, 400);
	}

	if (typeof body.branch !== "string" || body.branch.trim() === "") {
		return c.json({ error: "branch is required" }, 400);
	}

	try {
		const prInfo = await getPRForBranch(
			body.repoPath.trim(),
			body.branch.trim(),
			authResult.auth0UserId,
		);
		return c.json({ ok: true, pr: prInfo });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to get PR";
		return c.json({ ok: false, error: message }, 500);
	}
});

export default app;
