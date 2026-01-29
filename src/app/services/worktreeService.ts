import { spawn as nodeSpawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveRepoPath } from './localRepoService.ts';

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

function hasSpawnFunction(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { spawn: unknown } {
  return typeof value.spawn === 'function';
}

function isBunRuntime(value: unknown): value is IBunRuntime {
  if (typeof value !== 'object' || value === null || !('spawn' in value)) {
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
  if (!('Bun' in g)) {
    return null;
  }
  const maybeBun = g.Bun;
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

async function runCommand(
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> },
): Promise<ICommandResult> {
  const bun = getBunRuntime();

  if (bun) {
    const proc = bun.spawn(args, {
      cwd: options?.cwd,
      env: options?.env,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      proc.stdout.text(),
      proc.stderr.text(),
    ]);

    return {
      exitCode,
      stdout: stdout || '',
      stderr: stderr || '',
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

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

export interface IWorktreeInfo {
  path: string;
  branch: string;
  chatId: string;
  commitCount: number;
  lastActivity?: string;
}

export interface ICreateWorktreeResult {
  worktreePath: string;
  branch: string;
}

export interface IValidationResult {
  valid: boolean;
  branch: string;
  expectedBranch: string;
  branchMatch: boolean;
  isClean: boolean;
  uncommittedFiles: string[];
  commitCount: number;
  error?: string;
}

export interface IPostValidationResult {
  valid: boolean;
  branch: string;
  branchMatch: boolean;
  newCommits: number;
  totalCommits: number;
  lastCommitMessage: string;
  filesChanged: string[];
  hasUncommittedChanges: boolean;
  error?: string;
  branchRenamed?: boolean;
  originalBranch?: string;
  worktreeRenamed?: boolean;
  newWorktreePath?: string;
}

/**
 * Generate a short hash (5 characters) from chat ID
 * Similar to Claude/Cursor branch naming (e.g., feat/add-auth-Xa9K2)
 */
function generateShortHash(chatId: string): string {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const timestamp = Number.parseInt(chatId.replace('chat-', ''), 10);
  let result = '';
  let n = timestamp;

  while (n > 0) {
    result = chars[n % 62] + result;
    n = Math.floor(n / 62);
  }

  return (result || '0').slice(-5);
}

/**
 * Create a new worktree for a chat session
 */
export async function createWorktree(
  repoPath: string,
  chatId: string,
  _branchName?: string,
): Promise<ICreateWorktreeResult> {
  // 1. Validate repo exists and is a git repository
  const resolved = await resolveRepoPath(repoPath);

  // 2. Create .worktrees directory if it doesn't exist
  const worktreesDir = path.join(resolved, '.worktrees');
  await fs.mkdir(worktreesDir, { recursive: true });

  // 3. Create worktree with temporary name
  // Will be renamed to branch name after agent creates it (e.g., feat-add-auth-Xa9K2)
  const tempWorktreeName = `temp-${chatId}`;
  const worktreePath = path.join(worktreesDir, tempWorktreeName);

  // 4. Check if worktree already exists
  try {
    await fs.stat(worktreePath);
    throw new Error(`Worktree already exists for chat ${chatId}`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    }
  }

  // 5. Create worktree WITHOUT a branch (--detach)
  // Let the agent create the first branch with a descriptive name
  const createResult = await runCommand(
    ['git', 'worktree', 'add', '--detach', worktreePath],
    { cwd: resolved },
  );

  if (createResult.exitCode !== 0) {
    throw new Error(
      `Failed to create worktree: ${createResult.stderr || createResult.stdout}`,
    );
  }

  // 6. Create .agent-task-context directory with metadata
  const contextDir = path.join(worktreePath, '.agent-task-context');
  await fs.mkdir(contextDir, { recursive: true });
  // Store empty BRANCH_NAME initially - will be filled when agent creates branch
  await fs.writeFile(path.join(contextDir, 'BRANCH_NAME'), '');
  await fs.writeFile(path.join(contextDir, 'CHAT_ID'), chatId);

  // Save initial metadata
  const initialMetadata: IChatMetadata = {
    chatId,
    branch: '',
    title: 'New feature',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  await writeIChatMetadata(worktreePath, initialMetadata);

  // 7. Ensure .agent-task-context is ignored in this worktree
  const gitignorePath = path.join(worktreePath, '.gitignore');
  try {
    // Check if .gitignore already exists
    const existingGitignore = await fs.readFile(gitignorePath, 'utf-8');
    // Add .agent-task-context if not already present
    if (!existingGitignore.includes('.agent-task-context')) {
      await fs.appendFile(gitignorePath, '\n.agent-task-context/\n');
    }
  } catch {
    // .gitignore doesn't exist, create it
    await fs.writeFile(gitignorePath, '.agent-task-context/\n');
  }

  // 8. Return empty branch since agent will create it
  return { worktreePath, branch: '' };
}

/**
 * Validate a worktree before agent execution (pre-flight)
 */
export async function validateWorktree(
  worktreePath: string,
): Promise<IValidationResult> {
  try {
    // 1. Check worktree path exists
    await fs.stat(worktreePath);

    // 2. Verify it's a worktree (has .git file, not directory)
    const gitPath = path.join(worktreePath, '.git');
    const gitStat = await fs.stat(gitPath);
    if (gitStat.isDirectory()) {
      return {
        valid: false,
        error: 'Not a worktree (has .git directory, not file)',
        branch: '',
        expectedBranch: '',
        branchMatch: false,
        isClean: false,
        uncommittedFiles: [],
        commitCount: 0,
      };
    }

    // 3. Get current branch
    const branchResult = await runCommand(['git', 'branch', '--show-current'], {
      cwd: worktreePath,
    });

    if (branchResult.exitCode !== 0) {
      return {
        valid: false,
        error: `Failed to get current branch: ${branchResult.stderr}`,
        branch: '',
        expectedBranch: '',
        branchMatch: false,
        isClean: false,
        uncommittedFiles: [],
        commitCount: 0,
      };
    }

    const branch = branchResult.stdout.trim();

    // 4. Get expected branch from BRANCH_NAME file
    const branchNameFile = path.join(
      worktreePath,
      '.agent-task-context',
      'BRANCH_NAME',
    );
    let expectedBranch = '';
    try {
      expectedBranch = (await fs.readFile(branchNameFile, 'utf-8')).trim();
    } catch {
      // BRANCH_NAME file not found - this is okay on first run
      expectedBranch = '';
    }

    // If expectedBranch is empty (first run), any branch is valid
    // The agent will create the first branch
    const branchMatch = expectedBranch === '' || branch === expectedBranch;

    // 5. Check working directory status
    const statusResult = await runCommand(['git', 'status', '--porcelain'], {
      cwd: worktreePath,
    });

    const uncommittedFiles = statusResult.stdout
      .split('\n')
      .filter((line) => line.trim() !== '');

    // 6. Count commits on branch
    const commitCountResult = await runCommand(
      ['git', 'rev-list', '--count', 'HEAD'],
      { cwd: worktreePath },
    );

    const commitCount =
      commitCountResult.exitCode === 0
        ? Number.parseInt(commitCountResult.stdout.trim(), 10)
        : 0;

    return {
      valid: true,
      branch,
      expectedBranch,
      branchMatch,
      isClean: uncommittedFiles.length === 0,
      uncommittedFiles,
      commitCount,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error validating worktree',
      branch: '',
      expectedBranch: '',
      branchMatch: false,
      isClean: false,
      uncommittedFiles: [],
      commitCount: 0,
    };
  }
}

/**
 * Validate worktree after agent execution (post-flight)
 * Auto-appends short hash to branch name on first commit (Claude/Cursor style)
 */
export async function validateWorktreeResult(
  worktreePath: string,
  commitCountBefore: number,
): Promise<IPostValidationResult> {
  const validation = await validateWorktree(worktreePath);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error,
      branch: validation.branch,
      branchMatch: false,
      newCommits: 0,
      totalCommits: validation.commitCount,
      lastCommitMessage: '',
      filesChanged: [],
      hasUncommittedChanges: !validation.isClean,
    };
  }

  // Get chat ID from context
  const chatIdFile = path.join(worktreePath, '.agent-task-context', 'CHAT_ID');
  let chatId = '';
  try {
    chatId = (await fs.readFile(chatIdFile, 'utf-8')).trim();
  } catch {
    // If we can't read chat ID, skip renaming
  }

  // Generate short hash suffix (5 chars like Claude/Cursor)
  const shortHash = chatId ? generateShortHash(chatId) : '';
  const suffix = shortHash ? `-${shortHash}` : '';

  // Check if this is the first commit where agent created a branch
  // Only rename if:
  // 1. Branch doesn't already have hash suffix
  // 2. There's a new commit (newCommits > 0)
  // 3. Branch exists (not empty)
  const needsRename =
    suffix !== '' &&
    validation.branch !== '' &&
    !validation.branch.endsWith(suffix) &&
    validation.commitCount - commitCountBefore > 0;

  // Rename branch to add hash suffix
  if (needsRename) {
    const originalBranch = validation.branch;
    const newBranch = `${validation.branch}${suffix}`;

    try {
      // Rename branch with hash suffix
      const renameResult = await runCommand(
        ['git', 'branch', '-m', originalBranch, newBranch],
        { cwd: worktreePath },
      );

      if (renameResult.exitCode !== 0) {
        throw new Error(renameResult.stderr || 'Failed to rename branch');
      }

      // Update BRANCH_NAME file
      const branchNameFile = path.join(
        worktreePath,
        '.agent-task-context',
        'BRANCH_NAME',
      );
      await fs.writeFile(branchNameFile, newBranch);

      // Get commit info after rename
      const commitMsgResult = await runCommand(
        ['git', 'log', '-1', '--format=%s'],
        { cwd: worktreePath },
      );

      const lastCommitMessage =
        commitMsgResult.exitCode === 0 ? commitMsgResult.stdout.trim() : '';

      const filesChangedResult = await runCommand(
        ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
        { cwd: worktreePath },
      );

      const filesChanged =
        filesChangedResult.exitCode === 0
          ? filesChangedResult.stdout
              .split('\n')
              .filter((line) => line.trim() !== '')
          : [];

      // Rename worktree directory to match branch name (engineering convention)
      let newWorktreePath: string | undefined;
      let worktreeRenamed = false;

      // Only rename if worktree has temp- prefix
      if (worktreePath.includes('/temp-')) {
        try {
          newWorktreePath = await renameWorktreeDirectory(
            worktreePath,
            newBranch,
          );
          worktreeRenamed = true;
        } catch (error) {
          console.error('Failed to rename worktree directory:', error);
          // Don't fail validation if rename fails
        }
      }

      // Update metadata with branch name and title
      const finalWorktreePath =
        newWorktreePath !== undefined && newWorktreePath !== ''
          ? newWorktreePath
          : worktreePath;
      const existingMetadata = await readIChatMetadata(finalWorktreePath);
      if (existingMetadata) {
        // Generate title from branch name
        const displayName = newBranch.replace(/-[a-zA-Z0-9]{5}$/, '');
        const title = displayName
          .replace(/^(feat|fix|chore|refactor|test|docs)\//, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const updatedMetadata: IChatMetadata = {
          ...existingMetadata,
          branch: newBranch,
          title,
          updatedAt: new Date().toISOString(),
        };

        await writeIChatMetadata(finalWorktreePath, updatedMetadata);
      }

      return {
        valid: true,
        branch: newBranch,
        branchMatch: true,
        newCommits: validation.commitCount - commitCountBefore,
        totalCommits: validation.commitCount,
        lastCommitMessage,
        filesChanged,
        hasUncommittedChanges: !validation.isClean,
        branchRenamed: true,
        originalBranch,
        worktreeRenamed,
        newWorktreePath,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to rename branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        branch: validation.branch,
        branchMatch: false,
        newCommits: 0,
        totalCommits: validation.commitCount,
        lastCommitMessage: '',
        filesChanged: [],
        hasUncommittedChanges: !validation.isClean,
      };
    }
  }

  // Branch already has correct suffix or not first commit - normal validation
  const commitMsgResult = await runCommand(
    ['git', 'log', '-1', '--format=%s'],
    { cwd: worktreePath },
  );

  const lastCommitMessage =
    commitMsgResult.exitCode === 0 ? commitMsgResult.stdout.trim() : '';

  const filesChangedResult = await runCommand(
    ['git', 'diff', '--name-only', 'HEAD~1', 'HEAD'],
    { cwd: worktreePath },
  );

  const filesChanged =
    filesChangedResult.exitCode === 0
      ? filesChangedResult.stdout
          .split('\n')
          .filter((line) => line.trim() !== '')
      : [];

  return {
    valid: validation.valid && validation.branchMatch,
    branch: validation.branch,
    branchMatch: validation.branchMatch,
    newCommits: validation.commitCount - commitCountBefore,
    totalCommits: validation.commitCount,
    lastCommitMessage,
    filesChanged,
    hasUncommittedChanges: !validation.isClean,
  };
}

/**
 * List all worktrees for a repository
 */
export async function listWorktrees(
  repoPath: string,
): Promise<IWorktreeInfo[]> {
  const resolved = await resolveRepoPath(repoPath);

  const result = await runCommand(['git', 'worktree', 'list', '--porcelain'], {
    cwd: resolved,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list worktrees: ${result.stderr}`);
  }

  const worktrees: IWorktreeInfo[] = [];
  const lines = result.stdout.split('\n');

  let currentWorktree: Partial<IWorktreeInfo> = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      const worktreePath = line.substring(9);

      // Only include worktrees in .worktrees directory
      if (worktreePath.includes('/.worktrees/')) {
        currentWorktree.path = worktreePath;

        // Try to read chatId from .agent-task-context/CHAT_ID file
        // This is more reliable than parsing directory name
        try {
          const chatIdFile = path.join(
            worktreePath,
            '.agent-task-context',
            'CHAT_ID',
          );
          const chatIdContent = await fs.readFile(chatIdFile, 'utf-8');
          currentWorktree.chatId = chatIdContent.trim();
        } catch {
          // Fallback: extract from path if CHAT_ID file doesn't exist
          const match = /\.worktrees\/([^/]+)$/.exec(worktreePath);
          if (match?.[1] !== undefined) {
            currentWorktree.chatId = match[1];
          }
        }
      }
    } else if (
      line.startsWith('branch ') &&
      currentWorktree.path !== undefined &&
      currentWorktree.path !== ''
    ) {
      currentWorktree.branch = line.substring(7);
    } else if (
      line === '' &&
      currentWorktree.path !== undefined &&
      currentWorktree.path !== ''
    ) {
      // End of worktree block - get additional info
      try {
        const commitCountResult = await runCommand(
          ['git', 'rev-list', '--count', 'HEAD'],
          { cwd: currentWorktree.path },
        );
        currentWorktree.commitCount =
          commitCountResult.exitCode === 0
            ? Number.parseInt(commitCountResult.stdout.trim(), 10)
            : 0;

        // Get last commit date for activity
        const lastCommitResult = await runCommand(
          ['git', 'log', '-1', '--format=%ci'],
          { cwd: currentWorktree.path },
        );
        if (lastCommitResult.exitCode === 0) {
          currentWorktree.lastActivity = lastCommitResult.stdout.trim();
        }
      } catch {
        currentWorktree.commitCount = 0;
      }

      if (
        currentWorktree.path &&
        currentWorktree.branch &&
        currentWorktree.chatId
      ) {
        worktrees.push(currentWorktree as IWorktreeInfo);
      }
      currentWorktree = {};
    }
  }

  return worktrees;
}

/**
 * Rename worktree directory to match branch name (engineering convention)
 * Converts: .worktrees/temp-chat-123 → .worktrees/feat-add-auth-Xa9K2
 */
export async function renameWorktreeDirectory(
  oldPath: string,
  branch: string,
): Promise<string> {
  // Validate old path
  if (!oldPath.includes('/.worktrees/')) {
    throw new Error('Invalid worktree path');
  }

  await fs.stat(oldPath);

  // Generate new directory name from branch
  // feat/add-auth-Xa9K2 → feat-add-auth-Xa9K2
  const sanitizedBranch = branch.replace(/\//g, '-');

  // Get parent directory (.worktrees/)
  const worktreesDir = path.dirname(oldPath);
  const newPath = path.join(worktreesDir, sanitizedBranch);

  // Check if target already exists
  try {
    await fs.stat(newPath);
    throw new Error(`Worktree directory already exists: ${sanitizedBranch}`);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Get repo path for git worktree commands
  const repoPath = worktreesDir.replace('/.worktrees', '');

  // 1. Move the worktree directory
  await fs.rename(oldPath, newPath);

  // 2. Update git's worktree metadata (gitdir file)
  // The .git file in worktree points to main repo's worktree metadata
  // We need to update the gitdir file in main repo to point to new location
  const worktreeName = path.basename(oldPath);
  const gitWorktreeMetadataDir = path.join(
    repoPath,
    '.git',
    'worktrees',
    worktreeName,
  );

  try {
    // Update the gitdir file
    const gitdirFile = path.join(gitWorktreeMetadataDir, 'gitdir');
    const newGitFilePath = path.join(newPath, '.git');
    await fs.writeFile(gitdirFile, newGitFilePath);

    // Rename the metadata directory itself
    const newMetadataDir = path.join(
      repoPath,
      '.git',
      'worktrees',
      sanitizedBranch,
    );
    await fs.rename(gitWorktreeMetadataDir, newMetadataDir);

    // CRITICAL: Update the .git file inside the worktree to point to new metadata location
    const worktreeGitFile = path.join(newPath, '.git');
    const newMetadataPath = path.join(
      repoPath,
      '.git',
      'worktrees',
      sanitizedBranch,
    );
    await fs.writeFile(worktreeGitFile, `gitdir: ${newMetadataPath}\n`);
  } catch (error) {
    // If metadata update fails, rollback directory rename
    await fs.rename(newPath, oldPath);
    throw new Error(
      `Failed to update git metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  return newPath;
}

/**
 * Delete a worktree
 */
export async function deleteWorktree(worktreePath: string): Promise<void> {
  // Validate worktree path contains .worktrees/ for safety
  if (!worktreePath.includes('/.worktrees/')) {
    throw new Error('Invalid worktree path');
  }

  await fs.stat(worktreePath);

  // Get parent repo path
  const repoPath = worktreePath.split('/.worktrees/')[0];
  if (!repoPath) {
    throw new Error('Could not determine repository path');
  }

  const result = await runCommand(
    ['git', 'worktree', 'remove', worktreePath, '--force'],
    { cwd: repoPath },
  );

  if (result.exitCode !== 0) {
    throw new Error(`Failed to remove worktree: ${result.stderr}`);
  }
}

/**
 * Chat metadata stored in worktree
 */
export interface IChatMetadata {
  chatId: string;
  branch: string;
  title: string;
  description?: string;
  prNumber?: number;
  prTitle?: string;
  prUrl?: string;
  prStatus?: 'draft' | 'ready' | null;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
}

/**
 * Read chat metadata from worktree
 */
async function readIChatMetadata(
  worktreePath: string,
): Promise<IChatMetadata | null> {
  const metadataDir = path.join(worktreePath, '.agent-task-context');

  try {
    await fs.stat(metadataDir);
  } catch {
    // No metadata directory
    return null;
  }

  try {
    // Read metadata.json file
    const metadataFile = path.join(metadataDir, 'metadata.json');
    const content = await fs.readFile(metadataFile, 'utf-8');
    const metadata = JSON.parse(content) as IChatMetadata;
    return metadata;
  } catch {
    // Fallback: read individual files for backward compatibility
    try {
      const chatIdFile = path.join(metadataDir, 'CHAT_ID');
      const branchFile = path.join(metadataDir, 'BRANCH_NAME');

      const chatId = (await fs.readFile(chatIdFile, 'utf-8')).trim();
      const branch = (await fs.readFile(branchFile, 'utf-8')).trim();

      // Generate title from branch name
      const displayName = branch.replace(/-[a-zA-Z0-9]{5}$/, '');
      const title = displayName
        .replace(/^(feat|fix|chore|refactor|test|docs)\//, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        chatId,
        branch,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    } catch {
      return null;
    }
  }
}

/**
 * Write chat metadata to worktree
 */
export async function writeIChatMetadata(
  worktreePath: string,
  metadata: IChatMetadata,
): Promise<void> {
  const metadataDir = path.join(worktreePath, '.agent-task-context');

  // Ensure directory exists
  await fs.mkdir(metadataDir, { recursive: true });

  // Write metadata.json
  const metadataFile = path.join(metadataDir, 'metadata.json');
  await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

  // Also write individual files for backward compatibility
  await fs.writeFile(
    path.join(metadataDir, 'CHAT_ID'),
    metadata.chatId,
    'utf-8',
  );
  await fs.writeFile(
    path.join(metadataDir, 'BRANCH_NAME'),
    metadata.branch,
    'utf-8',
  );
}

/**
 * Add a message to chat metadata
 */
export async function addMessageToMetadata(
  worktreePath: string,
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  },
): Promise<void> {
  const metadata = await readIChatMetadata(worktreePath);
  if (!metadata) {
    throw new Error('Chat metadata not found');
  }

  metadata.messages.push(message);
  metadata.updatedAt = new Date().toISOString();

  await writeIChatMetadata(worktreePath, metadata);
}

/**
 * Scan worktrees directory and return all chats
 */
export async function scanWorktreeChats(repoPath: string): Promise<
  {
    worktreePath: string;
    metadata: IChatMetadata;
  }[]
> {
  const resolvedRepoPath = await resolveRepoPath(repoPath);
  const worktreesDir = path.join(resolvedRepoPath, '.worktrees');

  try {
    await fs.stat(worktreesDir);
  } catch {
    // No worktrees directory
    return [];
  }

  // Read all worktree directories
  const entries = await fs.readdir(worktreesDir, { withFileTypes: true });

  const chats: {
    worktreePath: string;
    metadata: IChatMetadata;
  }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const worktreePath = path.join(worktreesDir, entry.name);
    const metadata = await readIChatMetadata(worktreePath);

    if (metadata) {
      chats.push({
        worktreePath,
        metadata,
      });
    }
  }

  // Sort by updatedAt (newest first)
  chats.sort((a, b) => {
    return (
      new Date(b.metadata.updatedAt).getTime() -
      new Date(a.metadata.updatedAt).getTime()
    );
  });

  return chats;
}
