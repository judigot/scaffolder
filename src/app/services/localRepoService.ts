import { spawn as nodeSpawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

type CommandResult = {
	exitCode: number;
	stdout: string;
	stderr: string;
	durationMs: number;
	timedOut: boolean;
};

type BunRuntime = {
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
};

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const OUTPUT_LIMIT = 200_000;

function getBunRuntime(): BunRuntime | null {
	const globalWithBun = globalThis as { Bun?: unknown };
	const maybeBun = globalWithBun.Bun;
	if (!maybeBun || typeof maybeBun !== "object") {
		return null;
	}

	const candidate = maybeBun as Partial<BunRuntime>;
	if (typeof candidate.spawn !== "function") {
		return null;
	}

	return candidate as BunRuntime;
}

function truncateOutput(output: string): string {
	if (output.length <= OUTPUT_LIMIT) {
		return output;
	}

	return `${output.slice(0, OUTPUT_LIMIT)}\n[truncated ${output.length - OUTPUT_LIMIT} bytes]`;
}

async function runCommand(
	args: string[],
	options?: { cwd?: string; env?: Record<string, string>; timeoutMs?: number },
): Promise<CommandResult> {
	const start = Date.now();
	const timeoutMs = Math.min(
		options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
		MAX_TIMEOUT_MS,
	);
	const bun = getBunRuntime();

	if (bun) {
		const proc = bun.spawn(args, {
			cwd: options?.cwd,
			env: options?.env,
			stdout: "pipe",
			stderr: "pipe",
		});
		let timedOut = false;
		const timeoutId = setTimeout(() => {
			timedOut = true;
			proc.kill();
		}, timeoutMs);

		const [exitCode, stdout, stderr] = await Promise.all([
			proc.exited,
			proc.stdout.text(),
			proc.stderr.text(),
		]);

		clearTimeout(timeoutId);

		return {
			exitCode,
			stdout: truncateOutput(stdout || ""),
			stderr: truncateOutput(stderr || ""),
			durationMs: Date.now() - start,
			timedOut,
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
		let timedOut = false;
		const timeoutId = setTimeout(() => {
			timedOut = true;
			proc.kill("SIGKILL");
		}, timeoutMs);

		proc.stdout?.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
			if (stdout.length > OUTPUT_LIMIT) {
				stdout = stdout.slice(0, OUTPUT_LIMIT);
			}
		});
		proc.stderr?.on("data", (chunk: Buffer) => {
			stderr += chunk.toString();
			if (stderr.length > OUTPUT_LIMIT) {
				stderr = stderr.slice(0, OUTPUT_LIMIT);
			}
		});

		proc.on("close", (code) => {
			clearTimeout(timeoutId);
			resolve({
				exitCode: code ?? 1,
				stdout: truncateOutput(stdout),
				stderr: truncateOutput(stderr),
				durationMs: Date.now() - start,
				timedOut,
			});
		});
	});
}

export function getWorkspaceRoot(): string {
	return process.env.SCF_WORKSPACE_ROOT ?? "/home/ubuntu/scaffolder-workspaces";
}

export async function ensureWorkspaceRoot(): Promise<string> {
	const root = getWorkspaceRoot();
	await fs.mkdir(root, { recursive: true });
	return root;
}

export async function resolveWorkspacePath(
	targetPath: string,
): Promise<string> {
	const root = await ensureWorkspaceRoot();
	const resolvedRoot = await fs.realpath(root);
	const resolvedTarget = await fs.realpath(
		path.resolve(targetPath).replace(/\/+$/, ""),
	);

	if (!resolvedTarget.startsWith(resolvedRoot)) {
		throw new Error("Target path is outside workspace root");
	}

	return resolvedTarget;
}

export async function prepareRepoPath(
	owner: string,
	repo: string,
): Promise<string> {
	const root = await ensureWorkspaceRoot();
	const targetPath = path.join(root, owner, repo);
	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	return targetPath;
}

export async function isGitRepository(repoPath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(path.join(repoPath, ".git"));
		return stat.isDirectory();
	} catch {
		return false;
	}
}

export async function resolveRepoPath(repoPath: string): Promise<string> {
	const resolved = await resolveWorkspacePath(repoPath);
	const isRepo = await isGitRepository(resolved);
	if (!isRepo) {
		throw new Error("Target path is not a git repository");
	}
	return resolved;
}

export async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
}

export async function cloneRepository(
	repoUrl: string,
	repoPath: string,
	branch?: string,
): Promise<CommandResult> {
	const args = ["git", "clone"];
	if (branch) {
		args.push("--branch", branch, "--single-branch");
	}
	args.push(repoUrl, repoPath);

	return runCommand(args, {
		env: {
			GIT_TERMINAL_PROMPT: "0",
			GIT_ASKPASS: "true",
		},
		timeoutMs: DEFAULT_TIMEOUT_MS,
	});
}

export async function getDefaultBranch(
	repoPath: string,
): Promise<string | null> {
	const primary = await runCommand(
		[
			"git",
			"-C",
			repoPath,
			"symbolic-ref",
			"--short",
			"refs/remotes/origin/HEAD",
		],
		{ timeoutMs: 20_000 },
	);

	if (primary.exitCode === 0 && primary.stdout.trim() !== "") {
		const raw = primary.stdout.trim();
		const parts = raw.split("/");
		return parts[parts.length - 1] ?? null;
	}

	const fallback = await runCommand(
		["git", "-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD"],
		{ timeoutMs: 20_000 },
	);

	if (fallback.exitCode === 0 && fallback.stdout.trim() !== "") {
		return fallback.stdout.trim();
	}

	return null;
}

export async function getRepoStatus(repoPath: string): Promise<CommandResult> {
	return runCommand(["git", "-C", repoPath, "status", "--porcelain=v1", "-b"], {
		timeoutMs: 20_000,
	});
}

export async function getRepoBranches(
	repoPath: string,
): Promise<CommandResult> {
	return runCommand(["git", "-C", repoPath, "branch", "--list"], {
		timeoutMs: 20_000,
	});
}

export async function checkoutBranch(
	repoPath: string,
	branch: string,
): Promise<CommandResult> {
	return runCommand(["git", "-C", repoPath, "checkout", branch], {
		timeoutMs: 60_000,
	});
}

export function redactToken(value: string, token: string | null): string {
	if (!token || token.trim() === "") {
		return value;
	}

	return value.replaceAll(token, "***");
}
