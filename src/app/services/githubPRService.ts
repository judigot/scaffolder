import { spawn as nodeSpawn } from "node:child_process";
import { getGitHubToken } from "./auth0Service.ts";

interface ICommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

interface IBunRuntime {
	spawn: (
		args: string[],
		options: {
			cwd?: string;
			env?: Record<string, string>;
			stdout: "pipe";
			stderr: "pipe";
		},
	) => {
		stdout: { text: () => Promise<string> };
		stderr: { text: () => Promise<string> };
		exited: Promise<number>;
		kill: () => void;
	};
}

function hasSpawnFunction(
	value: Record<string, unknown>,
): value is Record<string, unknown> & { spawn: unknown } {
	return typeof value.spawn === "function";
}

function isBunRuntime(value: unknown): value is IBunRuntime {
	if (typeof value !== "object" || value === null || !("spawn" in value)) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return hasSpawnFunction(record);
}

function getGlobalAsRecord(): Record<string, unknown> {
	return globalThis as unknown as Record<string, unknown>;
}

function getBunRuntime(): IBunRuntime | null {
	const g = getGlobalAsRecord();
	if (!("Bun" in g)) {
		return null;
	}
	const maybeBun = g.Bun;
	if (
		maybeBun === null ||
		maybeBun === undefined ||
		typeof maybeBun !== "object"
	) {
		return null;
	}

	if (!isBunRuntime(maybeBun)) {
		return null;
	}

	return maybeBun;
}

async function runCommand(
	args: string[],
	options?: { cwd?: string; env?: Record<string, string> },
): Promise<ICommandResult> {
	const bun = getBunRuntime();

	if (bun !== null) {
		const proc = bun.spawn(args, {
			cwd: options?.cwd,
			env: options?.env,
			stdout: "pipe",
			stderr: "pipe",
		});

		const [exitCode, stdout, stderr] = await Promise.all([
			proc.exited,
			proc.stdout.text(),
			proc.stderr.text(),
		]);

		return {
			exitCode,
			stdout: stdout !== "" ? stdout : "",
			stderr: stderr !== "" ? stderr : "",
		};
	}

	return new Promise((resolve) => {
		const proc = nodeSpawn(args[0] ?? "", args.slice(1), {
			cwd: options?.cwd,
			env: options?.env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		proc.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		proc.on("close", (code) => {
			resolve({
				exitCode: code ?? 1,
				stdout,
				stderr,
			});
		});
	});
}

export interface IPRInfo {
	number: number;
	title: string;
	url: string;
}

interface IPRFromApi {
	number: number;
	title: string;
	url: string;
}

function isPRFromApi(value: unknown): value is IPRFromApi {
	if (
		typeof value !== "object" ||
		value === null ||
		!("number" in value) ||
		!("title" in value) ||
		!("url" in value)
	) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.number === "number" &&
		typeof record.title === "string" &&
		typeof record.url === "string"
	);
}

/**
 * Create a GitHub PR for a branch
 */
export async function createPullRequest(
	worktreePath: string,
	branch: string,
	auth0UserId: string,
): Promise<IPRInfo> {
	// Get GitHub token
	const token = await getGitHubToken(auth0UserId);
	if (token === null || token === undefined) {
		throw new Error("GitHub token not found");
	}
	if (token === "") {
		throw new Error("GitHub token not found");
	}

	// Set up environment with GitHub token
	const env = {
		...process.env,
		GH_TOKEN: token,
		GITHUB_TOKEN: token,
	};

	// 1. Push branch to remote
	const pushResult = await runCommand(["git", "push", "-u", "origin", branch], {
		cwd: worktreePath,
		env,
	});

	if (pushResult.exitCode !== 0) {
		throw new Error(`Failed to push branch: ${pushResult.stderr}`);
	}

	// 2. Generate PR title from branch name
	// feat/add-auth-Xa9K2 → Add auth
	const prTitle = formatBranchNameForPR(branch);

	// 3. Create PR using gh CLI
	const createPRResult = await runCommand(
		[
			"gh",
			"pr",
			"create",
			"--head",
			branch,
			"--title",
			prTitle,
			"--body",
			"Auto-generated PR from worktree chat",
			"--draft",
		],
		{ cwd: worktreePath, env },
	);

	if (createPRResult.exitCode !== 0) {
		throw new Error(`Failed to create PR: ${createPRResult.stderr}`);
	}

	// 4. Parse PR URL from output
	const prUrl = createPRResult.stdout.trim();

	// 5. Get PR number from URL
	// https://github.com/owner/repo/pull/42 → 42
	const prNumberMatch = /\/pull\/(\d+)$/.exec(prUrl);
	const prNumberStr = prNumberMatch !== null ? prNumberMatch[1] : undefined;
	const prNumber =
		prNumberStr !== undefined && prNumberStr !== ""
			? Number.parseInt(prNumberStr, 10)
			: 0;

	if (prNumber === 0) {
		throw new Error("Could not parse PR number from URL");
	}

	return {
		number: prNumber,
		title: prTitle,
		url: prUrl,
	};
}

/**
 * Get PR info for a branch (if PR exists)
 */
export async function getPRForBranch(
	repoPath: string,
	branch: string,
	auth0UserId: string,
): Promise<IPRInfo | null> {
	const token = await getGitHubToken(auth0UserId);
	if (token === null || token === undefined) {
		return null;
	}
	if (token === "") {
		return null;
	}

	const env = {
		...process.env,
		GH_TOKEN: token,
		GITHUB_TOKEN: token,
	};

	const result = await runCommand(
		["gh", "pr", "list", "--head", branch, "--json", "number,title,url"],
		{ cwd: repoPath, env },
	);

	if (result.exitCode !== 0) {
		return null;
	}

	try {
		const prs: unknown = JSON.parse(result.stdout);
		if (Array.isArray(prs) && prs.length > 0) {
			const pr: unknown = prs[0];
			if (isPRFromApi(pr)) {
				return {
					number: pr.number,
					title: pr.title,
					url: pr.url,
				};
			}
		}
	} catch {
		// JSON parse error
	}

	return null;
}

/**
 * Format branch name for PR title
 * feat/add-auth-Xa9K2 → Add auth
 */
function formatBranchNameForPR(branch: string): string {
	// Remove prefix (feat/, fix/, refactor/, docs/, chore/)
	let name = branch.replace(/^(feat|fix|refactor|docs|chore)\//, "");

	// Remove hash suffix (-Xxxxx)
	name = name.replace(/-[a-zA-Z0-9]{5}$/, "");

	// Replace dashes/underscores with spaces
	name = name.replace(/[-_]/g, " ");

	// Capitalize first letter
	name = name.charAt(0).toUpperCase() + name.slice(1);

	return name;
}
