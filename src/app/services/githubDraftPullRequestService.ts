import type { IStructure } from '@/components/FileViewer.tsx';
import {
  getGitHubAppConfig,
  getGitHubAppOctokit,
  getInstallationUrl,
} from '@/app/services/githubAppService.ts';
import { isProtectedBranchName } from '@/utils/parseAgentScaffoldUrls.ts';

interface IFileEntry {
  path: string;
  content: string;
  mode: '100644' | '100755' | '120000';
  type: 'blob';
  isBinary?: boolean;
}

interface IGitTreeEntry {
  path: string;
  mode: '100644' | '100755' | '120000';
  type: 'blob';
  sha: string;
}

export interface IPublishDraftPullRequestParams {
  owner: string;
  repo: string;
  branch?: string;
  structure: IStructure;
  commitMessage: string;
  prTitle: string;
  prBody: string;
  draft: boolean;
  prNumber?: number;
  updateExisting?: boolean;
}

export interface IDraftPullRequestResult {
  prUrl: string;
  prNumber: number;
  branch: string;
  commitSha: string;
  filesCreated: number;
  baseBranch: string;
  updated?: boolean;
}

export interface IGitHubPullHead {
  ref: string;
  sha: string;
  repo: { full_name: string } | null;
}

export interface IGitHubPullBase {
  ref: string;
  repo: { full_name: string };
}

export interface IGitHubPullRequest {
  html_url: string;
  number: number;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  head: IGitHubPullHead;
  base: IGitHubPullBase;
}

export interface IGitHubGitClient {
  repos: {
    get: (params: {
      owner: string;
      repo: string;
    }) => Promise<{ data: { default_branch: string } }>;
  };
  git: {
    getRef: (params: {
      owner: string;
      repo: string;
      ref: string;
    }) => Promise<{ data: { object: { sha: string } } }>;
    getCommit: (params: {
      owner: string;
      repo: string;
      commit_sha: string;
    }) => Promise<{ data: { tree: { sha: string } } }>;
    createBlob: (params: {
      owner: string;
      repo: string;
      content: string;
      encoding: 'base64';
    }) => Promise<{ data: { sha: string } }>;
    createTree: (params: {
      owner: string;
      repo: string;
      base_tree: string;
      tree: IGitTreeEntry[];
    }) => Promise<{ data: { sha: string } }>;
    createCommit: (params: {
      owner: string;
      repo: string;
      message: string;
      tree: string;
      parents: string[];
    }) => Promise<{ data: { sha: string } }>;
    createRef: (params: {
      owner: string;
      repo: string;
      ref: string;
      sha: string;
    }) => Promise<unknown>;
    updateRef: (params: {
      owner: string;
      repo: string;
      ref: string;
      sha: string;
      force?: boolean;
    }) => Promise<unknown>;
  };
  pulls: {
    create: (params: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      head: string;
      base: string;
      draft: boolean;
    }) => Promise<{ data: { html_url: string; number: number } }>;
    get: (params: {
      owner: string;
      repo: string;
      pull_number: number;
    }) => Promise<{ data: IGitHubPullRequest }>;
    list: (params: {
      owner: string;
      repo: string;
      head?: string;
      state?: 'open' | 'closed' | 'all';
    }) => Promise<{ data: IGitHubPullRequest[] }>;
  };
}

export interface IGitHubDraftPullRequestDependencies {
  getOctokit?: (owner: string, repo: string) => Promise<IGitHubGitClient>;
}

function collectFiles(
  structure: IStructure,
  currentPath: string,
): IFileEntry[] {
  const files: IFileEntry[] = [];

  for (const item of structure) {
    if (item.type === 'folder') {
      const folderPath =
        currentPath === '' ? item.name : `${currentPath}/${item.name}`;
      files.push(...collectFiles(item.children, folderPath));
    } else {
      const filePath =
        currentPath === '' ? item.name : `${currentPath}/${item.name}`;
      files.push({
        path: filePath,
        content: item.content,
        mode: '100644',
        type: 'blob',
        isBinary: item.isBinary,
      });
    }
  }

  return files;
}

export class GitHubDraftPullRequestError extends Error {
  readonly status: 400 | 403 | 500;
  readonly code: string;
  readonly installationUrl?: string;

  constructor(
    message: string,
    options: {
      status: 400 | 403 | 500;
      code: string;
      installationUrl?: string;
    },
  ) {
    super(message);
    this.name = 'GitHubDraftPullRequestError';
    this.status = options.status;
    this.code = options.code;
    this.installationUrl = options.installationUrl;
  }
}

interface IBranchHead {
  sha: string;
  treeSha: string;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

function isNotFoundError(error: unknown): boolean {
  return getErrorStatus(error) === 404;
}

function normalizeRepoFullName(owner: string, repo: string): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function isSameRepo(
  fullName: string | null | undefined,
  owner: string,
  repo: string,
): boolean {
  if (fullName === null || fullName === undefined) {
    return false;
  }
  return fullName.toLowerCase() === normalizeRepoFullName(owner, repo);
}

async function getOctokitClient(
  owner: string,
  repo: string,
  getOctokit: IGitHubDraftPullRequestDependencies['getOctokit'],
): Promise<IGitHubGitClient> {
  if (getOctokit !== undefined) {
    return getOctokit(owner, repo);
  }

  const appConfig = getGitHubAppConfig();
  if (appConfig === null) {
    throw new GitHubDraftPullRequestError(
      'GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.',
      { status: 500, code: 'GITHUB_APP_NOT_CONFIGURED' },
    );
  }
  try {
    return await getGitHubAppOctokit(appConfig, { owner, repo });
  } catch (error: unknown) {
    const installationUrl = await getInstallationUrl(owner);
    const message =
      error instanceof Error
        ? error.message
        : `GitHub App is not installed for ${owner}`;
    throw new GitHubDraftPullRequestError(message, {
      status: 403,
      code: 'GITHUB_APP_NOT_INSTALLED',
      installationUrl,
    });
  }
}

async function createGeneratedTree(
  octokit: IGitHubGitClient,
  owner: string,
  repo: string,
  baseTreeSha: string,
  files: IFileEntry[],
): Promise<string> {
  const blobMap = new Map<string, string>();
  for (const file of files) {
    const base64Content =
      file.isBinary === true
        ? file.content
        : Buffer.from(file.content, 'utf-8').toString('base64');
    const blob = await octokit.git.createBlob({
      owner,
      repo,
      content: base64Content,
      encoding: 'base64',
    });
    blobMap.set(file.path, blob.data.sha);
  }

  const tree = files.map((file) => {
    const sha = blobMap.get(file.path);
    if (sha === undefined) {
      throw new GitHubDraftPullRequestError(`Missing blob for ${file.path}`, {
        status: 500,
        code: 'BLOB_MISSING',
      });
    }
    return {
      path: file.path,
      mode: file.mode,
      type: file.type,
      sha,
    };
  });

  const treeResponse = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree,
  });
  return treeResponse.data.sha;
}

async function getBranchHead(
  octokit: IGitHubGitClient,
  owner: string,
  repo: string,
  branch: string,
): Promise<IBranchHead | null> {
  try {
    const ref = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const commit = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: ref.data.object.sha,
    });
    return {
      sha: ref.data.object.sha,
      treeSha: commit.data.tree.sha,
    };
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

async function getOpenPullRequest(
  octokit: IGitHubGitClient,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<IGitHubPullRequest> {
  try {
    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return response.data;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      throw new GitHubDraftPullRequestError(
        `Pull request #${String(pullNumber)} was not found on ${owner}/${repo}`,
        { status: 400, code: 'PR_NOT_FOUND' },
      );
    }
    throw error;
  }
}

function assertPullRequestWritable(
  pull: IGitHubPullRequest,
  owner: string,
  repo: string,
  requestedBranch: string | undefined,
  defaultBranch: string,
): void {
  if (
    !isSameRepo(pull.base.repo.full_name, owner, repo) ||
    !isSameRepo(pull.head.repo?.full_name, owner, repo)
  ) {
    throw new GitHubDraftPullRequestError(
      `Pull request #${String(pull.number)} is not on ${owner}/${repo}`,
      { status: 400, code: 'PR_REPO_MISMATCH' },
    );
  }

  if (pull.state !== 'open' || pull.merged) {
    throw new GitHubDraftPullRequestError(
      `Pull request #${String(pull.number)} is not open`,
      { status: 400, code: 'PR_NOT_OPEN' },
    );
  }

  if (isProtectedBranchName(pull.head.ref, defaultBranch)) {
    throw new GitHubDraftPullRequestError(
      `Refusing to write to protected branch "${pull.head.ref}"`,
      { status: 400, code: 'PROTECTED_BRANCH' },
    );
  }

  if (requestedBranch !== undefined && requestedBranch !== pull.head.ref) {
    throw new GitHubDraftPullRequestError(
      `branch "${requestedBranch}" does not match pull request #${String(pull.number)} head "${pull.head.ref}"`,
      { status: 400, code: 'BRANCH_PR_MISMATCH' },
    );
  }
}

async function findOpenPullForBranch(
  octokit: IGitHubGitClient,
  owner: string,
  repo: string,
  branch: string,
): Promise<IGitHubPullRequest | null> {
  const listed = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${branch}`,
    state: 'open',
  });
  if (listed.data.length === 0) {
    return null;
  }
  return listed.data[0];
}

async function createDraftPull(
  octokit: IGitHubGitClient,
  params: IPublishDraftPullRequestParams,
  branch: string,
  baseBranch: string,
): Promise<{ html_url: string; number: number }> {
  const pull = await octokit.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.prTitle,
    body: params.prBody,
    head: branch,
    base: baseBranch,
    draft: params.draft,
  });
  return pull.data;
}

async function resolveExistingOrCreatedPull(
  octokit: IGitHubGitClient,
  params: IPublishDraftPullRequestParams,
  branch: string,
  baseBranch: string,
  knownPull: IGitHubPullRequest | null,
): Promise<{ html_url: string; number: number }> {
  if (knownPull !== null) {
    return { html_url: knownPull.html_url, number: knownPull.number };
  }

  const existing = await findOpenPullForBranch(
    octokit,
    params.owner,
    params.repo,
    branch,
  );
  if (existing !== null) {
    return { html_url: existing.html_url, number: existing.number };
  }

  return createDraftPull(octokit, params, branch, baseBranch);
}

async function fastForwardBranch(
  octokit: IGitHubGitClient,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
): Promise<void> {
  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha,
      force: false,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update branch';
    throw new GitHubDraftPullRequestError(
      `Could not update branch "${branch}" without force-push: ${message}`,
      { status: 400, code: 'BRANCH_UPDATE_FAILED' },
    );
  }
}

export async function publishDraftPullRequest(
  params: IPublishDraftPullRequestParams,
  dependencies: IGitHubDraftPullRequestDependencies = {},
): Promise<IDraftPullRequestResult> {
  const files = collectFiles(params.structure, '');
  if (files.length === 0) {
    throw new GitHubDraftPullRequestError('No generated files to commit', {
      status: 400,
      code: 'NO_FILES',
    });
  }

  const octokit = await getOctokitClient(
    params.owner,
    params.repo,
    dependencies.getOctokit,
  );
  const repoResponse = await octokit.repos.get({
    owner: params.owner,
    repo: params.repo,
  });
  const baseBranch = repoResponse.data.default_branch;

  let knownPull: IGitHubPullRequest | null = null;
  if (params.prNumber !== undefined) {
    knownPull = await getOpenPullRequest(
      octokit,
      params.owner,
      params.repo,
      params.prNumber,
    );
    assertPullRequestWritable(
      knownPull,
      params.owner,
      params.repo,
      params.branch,
      baseBranch,
    );
  }

  const branch = knownPull?.head.ref ?? params.branch;
  if (branch === undefined || isProtectedBranchName(branch, baseBranch)) {
    throw new GitHubDraftPullRequestError(
      `Refusing to write to protected branch "${branch ?? params.branch ?? 'unknown'}"`,
      { status: 400, code: 'PROTECTED_BRANCH' },
    );
  }

  const baseRef = await octokit.git.getRef({
    owner: params.owner,
    repo: params.repo,
    ref: `heads/${baseBranch}`,
  });
  const baseCommitSha = baseRef.data.object.sha;
  const baseCommit = await octokit.git.getCommit({
    owner: params.owner,
    repo: params.repo,
    commit_sha: baseCommitSha,
  });
  const treeSha = await createGeneratedTree(
    octokit,
    params.owner,
    params.repo,
    baseCommit.data.tree.sha,
    files,
  );

  const shouldUpdateExisting =
    params.updateExisting === true || params.prNumber !== undefined;
  const existingHead = shouldUpdateExisting
    ? await getBranchHead(octokit, params.owner, params.repo, branch)
    : null;

  if (existingHead !== null && treeSha === existingHead.treeSha) {
    const pull = await resolveExistingOrCreatedPull(
      octokit,
      params,
      branch,
      baseBranch,
      knownPull,
    );
    return {
      prUrl: pull.html_url,
      prNumber: pull.number,
      branch,
      commitSha: existingHead.sha,
      filesCreated: files.length,
      baseBranch,
      updated: true,
    };
  }

  if (existingHead !== null) {
    const commitResponse = await octokit.git.createCommit({
      owner: params.owner,
      repo: params.repo,
      message: params.commitMessage,
      tree: treeSha,
      parents: [existingHead.sha],
    });
    await fastForwardBranch(
      octokit,
      params.owner,
      params.repo,
      branch,
      commitResponse.data.sha,
    );
    const pull = await resolveExistingOrCreatedPull(
      octokit,
      params,
      branch,
      baseBranch,
      knownPull,
    );
    return {
      prUrl: pull.html_url,
      prNumber: pull.number,
      branch,
      commitSha: commitResponse.data.sha,
      filesCreated: files.length,
      baseBranch,
      updated: true,
    };
  }

  const commitResponse = await octokit.git.createCommit({
    owner: params.owner,
    repo: params.repo,
    message: params.commitMessage,
    tree: treeSha,
    parents: [baseCommitSha],
  });

  try {
    await octokit.git.createRef({
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${branch}`,
      sha: commitResponse.data.sha,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create branch';
    throw new GitHubDraftPullRequestError(
      `Could not create branch "${branch}": ${message}`,
      { status: 400, code: 'BRANCH_CREATE_FAILED' },
    );
  }

  const pull = await resolveExistingOrCreatedPull(
    octokit,
    params,
    branch,
    baseBranch,
    knownPull,
  );

  return {
    prUrl: pull.html_url,
    prNumber: pull.number,
    branch,
    commitSha: commitResponse.data.sha,
    filesCreated: files.length,
    baseBranch,
    updated: false,
  };
}
