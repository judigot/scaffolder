import { Hono } from "hono";
import { cors } from "hono/cors";
import { getGitHubToken } from "@/app/services/auth0Service.ts";
import {
	cloneRepository,
	getDefaultBranch,
	isGitRepository,
	pathExists,
	prepareRepoPath,
	redactToken,
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
	if (!match || !match[1] || !match[2]) {
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

	const repoUrl = body.repoUrl.trim();
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

export default app;
