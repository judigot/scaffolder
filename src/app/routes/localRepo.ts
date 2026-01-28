import { Hono } from "hono";
import { cors } from "hono/cors";
import { getGitHubToken } from "@/app/services/auth0Service.ts";
import {
	checkoutBranch,
	cloneRepository,
	deleteRepository,
	fetchRepository,
	getDefaultBranch,
	getRepoBranches,
	getRepoStatus,
	getRepoStatusInfo,
	isGitRepository,
	pathExists,
	prepareRepoPath,
	pullRepository,
	redactToken,
	resolveRepoPath,
} from "@/app/services/localRepoService.ts";
import { verifyAuth0TokenFromAuthHeader } from "@/utils/verifyAuth0Token.ts";

interface IClonePayload {
	repoUrl?: unknown;
	branch?: unknown;
}

const app = new Hono();
app.use("*", cors());

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
	const match = /github\.com\/([^/]+)\/([^/]+)/i.exec(url);
	if (!match?.[1] || !match[2]) {
		return null;
	}

	return {
		owner: match[1],
		repo: match[2].replace(/\.git$/, ""),
	};
}

app.post("/clone", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);

	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IClonePayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.repoUrl !== "string" || body.repoUrl.trim() === "") {
		return c.json({ error: "Repository URL is required" }, 400);
	}

	const repoInput = body.repoUrl.trim();
	const repoUrl = repoInput.startsWith("http")
		? repoInput
		: `https://github.com/${repoInput}`;
	const repoInfo = parseGitHubUrl(repoUrl);
	if (!repoInfo) {
		return c.json({ error: "Invalid GitHub repository URL" }, 400);
	}

	const branch =
		typeof body.branch === "string" ? body.branch.trim() : undefined;
	const auth0UserId = authResult.auth0UserId;

	const token = await getGitHubToken(auth0UserId);
	const cloneUrl = token
		? `https://x-access-token:${token}@github.com/${repoInfo.owner}/${repoInfo.repo}.git`
		: `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;

	const repoPath = await prepareRepoPath(repoInfo.owner, repoInfo.repo);
	const pathAlreadyExists = await pathExists(repoPath);
	const exists = await isGitRepository(repoPath);

	if (pathAlreadyExists && !exists) {
		return c.json(
			{
				ok: false,
				error: "Target path exists and is not a git repository",
			},
			409,
		);
	}

	if (exists) {
		const defaultBranch = await getDefaultBranch(repoPath);
		return c.json({
			ok: true,
			status: "already_cloned",
			repoPath,
			defaultBranch: defaultBranch ?? "",
			authType: token ? "github-token" : "public",
		});
	}

	const result = await cloneRepository(cloneUrl, repoPath, branch);
	if (result.exitCode !== 0) {
		const redactedStdout = redactToken(result.stdout, token);
		const redactedStderr = redactToken(result.stderr, token);
		return c.json(
			{
				ok: false,
				error: "Failed to clone repository",
				details: redactedStderr || redactedStdout || "Unknown error",
			},
			502,
		);
	}

	const defaultBranch = await getDefaultBranch(repoPath);
	return c.json({
		ok: true,
		status: "cloned",
		repoPath,
		defaultBranch: defaultBranch ?? "",
		authType: token ? "github-token" : "public",
	});
});

interface IRepoPathPayload {
	repoPath?: unknown;
}

interface ICheckoutPayload extends IRepoPathPayload {
	branch?: unknown;
}

async function getRepoPathFromBody(payload: IRepoPathPayload): Promise<string> {
	if (typeof payload.repoPath !== "string" || payload.repoPath.trim() === "") {
		throw new Error("Repository path is required");
	}

	return resolveRepoPath(payload.repoPath.trim());
}

app.post("/status", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IRepoPathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		const repoPath = await getRepoPathFromBody(body);
		const result = await getRepoStatus(repoPath);
		return c.json({
			ok: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
			timedOut: result.timedOut,
			durationMs: result.durationMs,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid repository path";
		return c.json({ error: message }, 400);
	}
});

app.post("/branches", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IRepoPathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		const repoPath = await getRepoPathFromBody(body);
		const result = await getRepoBranches(repoPath);
		return c.json({
			ok: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
			timedOut: result.timedOut,
			durationMs: result.durationMs,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid repository path";
		return c.json({ error: message }, 400);
	}
});

app.post("/checkout", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: ICheckoutPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (typeof body.branch !== "string" || body.branch.trim() === "") {
		return c.json({ error: "Branch is required" }, 400);
	}

	try {
		const repoPath = await getRepoPathFromBody(body);
		const result = await checkoutBranch(repoPath, body.branch.trim());
		return c.json({
			ok: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
			timedOut: result.timedOut,
			durationMs: result.durationMs,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid repository path";
		return c.json({ error: message }, 400);
	}
});

interface IDeletePayload extends IRepoPathPayload {
	confirm?: unknown;
}

app.post("/delete", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IDeletePayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	if (body.confirm !== true) {
		return c.json({ error: "Confirmation required (confirm: true)" }, 400);
	}

	try {
		const repoPath =
			typeof body.repoPath === "string" && body.repoPath.trim() !== ""
				? body.repoPath.trim()
				: "";
		if (repoPath === "") {
			return c.json({ error: "Repository path is required" }, 400);
		}

		await deleteRepository(repoPath);
		return c.json({ ok: true, deleted: repoPath });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete repository";
		return c.json({ error: message }, 400);
	}
});

app.post("/fetch", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IRepoPathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		const repoPath = await getRepoPathFromBody(body);
		const result = await fetchRepository(repoPath);
		return c.json({
			ok: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
			timedOut: result.timedOut,
			durationMs: result.durationMs,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid repository path";
		return c.json({ error: message }, 400);
	}
});

app.post("/pull", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IRepoPathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		const repoPath = await getRepoPathFromBody(body);
		const result = await pullRepository(repoPath);
		return c.json({
			ok: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
			timedOut: result.timedOut,
			durationMs: result.durationMs,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid repository path";
		return c.json({ error: message }, 400);
	}
});

app.post("/status-info", async (c) => {
	const authResult = await verifyAuth0TokenFromAuthHeader(
		c.req.header("authorization"),
	);
	if (!authResult.ok) {
		return c.json(authResult.body, authResult.status);
	}

	let body: IRepoPathPayload;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	try {
		const repoPath = await getRepoPathFromBody(body);
		const statusInfo = await getRepoStatusInfo(repoPath);
		return c.json({ ok: true, ...statusInfo });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid repository path";
		return c.json({ error: message }, 400);
	}
});

export default app;
