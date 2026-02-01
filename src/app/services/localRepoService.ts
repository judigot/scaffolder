import { spawn as nodeSpawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { IStructure } from '@/components/FileViewer.tsx';
import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';

interface ICommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

interface IBunRuntime {
  spawn: (
    args: string[],
    options: {
      cwd?: string;
      env?: Record<string, string>;
      stdout: 'pipe';
      stderr: 'pipe';
    },
  ) => {
    stdout: { text: () => Promise<string> };
    stderr: { text: () => Promise<string> };
    exited: Promise<number>;
    kill: () => void;
  };
}

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const OUTPUT_LIMIT = 200_000;

function hasSpawnFunction(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { spawn: unknown } {
  return typeof value.spawn === 'function';
}

function isObjectWithSpawn(
  value: object,
): value is object & { spawn: unknown } {
  return 'spawn' in value;
}

function isBunRuntime(value: unknown): value is IBunRuntime {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!isObjectWithSpawn(value)) {
    return false;
  }
  const record: Record<string, unknown> = { spawn: value.spawn };
  return hasSpawnFunction(record);
}

function getGlobalBunValue(): unknown {
  if ('Bun' in globalThis) {
    return Reflect.get(globalThis, 'Bun');
  }
  return null;
}

function getBunRuntime(): IBunRuntime | null {
  const maybeBun = getGlobalBunValue();
  if (
    maybeBun === null ||
    maybeBun === undefined ||
    typeof maybeBun !== 'object'
  ) {
    return null;
  }

  if (!isBunRuntime(maybeBun)) {
    return null;
  }

  return maybeBun;
}

function truncateOutput(output: string): string {
  if (output.length <= OUTPUT_LIMIT) {
    return output;
  }

  return `${output.slice(0, OUTPUT_LIMIT)}\n[truncated ${String(output.length - OUTPUT_LIMIT)} bytes]`;
}

async function runCommand(
  args: string[],
  options?: { cwd?: string; env?: Record<string, string>; timeoutMs?: number },
): Promise<ICommandResult> {
  const start = Date.now();
  const timeoutMs = Math.min(
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const bun = getBunRuntime();

  if (bun !== null) {
    const proc = bun.spawn(args, {
      cwd: options?.cwd,
      env: options?.env,
      stdout: 'pipe',
      stderr: 'pipe',
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
      stdout: truncateOutput(stdout !== '' ? stdout : ''),
      stderr: truncateOutput(stderr !== '' ? stderr : ''),
      durationMs: Date.now() - start,
      timedOut,
    };
  }

  return new Promise((resolve) => {
    const proc = nodeSpawn(args[0] ?? '', args.slice(1), {
      cwd: options?.cwd,
      env: options?.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > OUTPUT_LIMIT) {
        stdout = stdout.slice(0, OUTPUT_LIMIT);
      }
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > OUTPUT_LIMIT) {
        stderr = stderr.slice(0, OUTPUT_LIMIT);
      }
    });

    proc.on('close', (code) => {
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
  return process.env.SCF_WORKSPACE_ROOT ?? '/home/ubuntu/scaffolder-workspaces';
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
    path.resolve(targetPath).replace(/\/+$/, ''),
  );

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error('Target path is outside workspace root');
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
    const stat = await fs.stat(path.join(repoPath, '.git'));
    // Accept both directory (normal repo) and file (worktree)
    return stat.isDirectory() || stat.isFile();
  } catch {
    return false;
  }
}

export async function resolveRepoPath(repoPath: string): Promise<string> {
  const resolved = await resolveWorkspacePath(repoPath);
  const isRepo = await isGitRepository(resolved);
  if (!isRepo) {
    throw new Error('Target path is not a git repository');
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
): Promise<ICommandResult> {
  const args = ['git', 'clone'];
  if (branch !== undefined && branch !== '') {
    args.push('--branch', branch, '--single-branch');
  }
  args.push(repoUrl, repoPath);

  return runCommand(args, {
    env: {
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'true',
    },
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
}

export async function getDefaultBranch(
  repoPath: string,
): Promise<string | null> {
  const primary = await runCommand(
    [
      'git',
      '-C',
      repoPath,
      'symbolic-ref',
      '--short',
      'refs/remotes/origin/HEAD',
    ],
    { timeoutMs: 20_000 },
  );

  if (primary.exitCode === 0 && primary.stdout.trim() !== '') {
    const raw = primary.stdout.trim();
    const parts = raw.split('/');
    return parts[parts.length - 1] ?? null;
  }

  const fallback = await runCommand(
    ['git', '-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD'],
    { timeoutMs: 20_000 },
  );

  if (fallback.exitCode === 0 && fallback.stdout.trim() !== '') {
    return fallback.stdout.trim();
  }

  return null;
}

export async function getRepoStatus(repoPath: string): Promise<ICommandResult> {
  return runCommand(['git', '-C', repoPath, 'status', '--porcelain=v1', '-b'], {
    timeoutMs: 20_000,
  });
}

export async function getRepoBranches(
  repoPath: string,
): Promise<ICommandResult> {
  return runCommand(['git', '-C', repoPath, 'branch', '--list'], {
    timeoutMs: 20_000,
  });
}

export async function checkoutBranch(
  repoPath: string,
  branch: string,
): Promise<ICommandResult> {
  return runCommand(['git', '-C', repoPath, 'checkout', branch], {
    timeoutMs: 60_000,
  });
}

export function redactToken(value: string, token: string | null): string {
  if (token === null || token.trim() === '') {
    return value;
  }

  return value.replaceAll(token, '***');
}

export async function deleteRepository(repoPath: string): Promise<void> {
  const resolved = await resolveWorkspacePath(repoPath);
  const isRepo = await isGitRepository(resolved);
  if (!isRepo) {
    throw new Error('Target path is not a git repository');
  }

  await fs.rm(resolved, { recursive: true, force: true });
}

export async function fetchRepository(
  repoPath: string,
): Promise<ICommandResult> {
  return runCommand(['git', '-C', repoPath, 'fetch', '--all', '--prune'], {
    env: {
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'true',
    },
    timeoutMs: 60_000,
  });
}

export async function pullRepository(
  repoPath: string,
): Promise<ICommandResult> {
  return runCommand(['git', '-C', repoPath, 'pull', '--ff-only'], {
    env: {
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'true',
    },
    timeoutMs: 60_000,
  });
}

export async function getLastCommit(
  repoPath: string,
): Promise<{ hash: string; message: string; date: string } | null> {
  const result = await runCommand(
    ['git', '-C', repoPath, 'log', '-1', '--format=%H%n%s%n%ci'],
    { timeoutMs: 20_000 },
  );

  if (result.exitCode !== 0 || result.stdout.trim() === '') {
    return null;
  }

  const lines = result.stdout.trim().split('\n');
  const hash = lines[0] ?? '';
  const message = lines[1] ?? '';
  const date = lines[2] ?? '';

  if (hash === '') {
    return null;
  }

  return { hash, message, date };
}

export async function getCurrentBranch(
  repoPath: string,
): Promise<string | null> {
  const result = await runCommand(
    ['git', '-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD'],
    { timeoutMs: 20_000 },
  );

  if (result.exitCode === 0 && result.stdout.trim() !== '') {
    return result.stdout.trim();
  }

  return null;
}

export interface IRepoStatusInfo {
  branch: string | null;
  isDirty: boolean;
  ahead: number;
  behind: number;
  lastCommit: { hash: string; message: string; date: string } | null;
}

export async function getRepoStatusInfo(
  repoPath: string,
): Promise<IRepoStatusInfo> {
  const [statusResult, branch, lastCommit] = await Promise.all([
    getRepoStatus(repoPath),
    getCurrentBranch(repoPath),
    getLastCommit(repoPath),
  ]);

  let isDirty = false;
  let ahead = 0;
  let behind = 0;

  if (statusResult.exitCode === 0) {
    const lines = statusResult.stdout.split('\n');
    const branchLine = lines[0] ?? '';

    // Parse ahead/behind from branch line: ## main...origin/main [ahead 1, behind 2]
    const aheadMatch = /ahead (\d+)/.exec(branchLine);
    const behindMatch = /behind (\d+)/.exec(branchLine);
    if (aheadMatch?.[1] !== undefined) {
      ahead = Number.parseInt(aheadMatch[1], 10);
    }
    if (behindMatch?.[1] !== undefined) {
      behind = Number.parseInt(behindMatch[1], 10);
    }

    // Check if there are uncommitted changes (lines after the branch line)
    isDirty = lines.slice(1).some((line: string) => line.trim() !== '');
  }

  return { branch, isDirty, ahead, behind, lastCommit };
}

/**
 * Get files from a local repository clone as IStructure format.
 * Uses the same format as getUserFilesFromPublicRepo for consistency.
 */
export async function getLocalRepoFiles(repoPath: string): Promise<IStructure> {
  const resolved = await resolveRepoPath(repoPath);
  return convertLocalFilesToIStructure(resolved);
}

/**
 * Check if a repository is cloned locally and return its path if it exists.
 * @param owner - Repository owner (e.g., "judigot")
 * @param repo - Repository name (e.g., "scaffolder")
 * @returns The local path if cloned, null otherwise
 */
export async function getLocalClonePath(
  owner: string,
  repo: string,
): Promise<string | null> {
  const root = getWorkspaceRoot();
  const expectedPath = path.join(root, owner, repo);

  const exists = await pathExists(expectedPath);
  if (!exists) {
    return null;
  }

  const isRepo = await isGitRepository(expectedPath);
  if (!isRepo) {
    return null;
  }

  return expectedPath;
}
