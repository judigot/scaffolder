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
  branch: string;
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

  const getOctokit =
    dependencies.getOctokit ??
    (async (owner: string, repo: string) => {
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
    });

  const octokit = await getOctokit(params.owner, params.repo);
  const repoResponse = await octokit.repos.get({
    owner: params.owner,
    repo: params.repo,
  });
  const baseBranch = repoResponse.data.default_branch;

  if (isProtectedBranchName(params.branch, baseBranch)) {
    throw new GitHubDraftPullRequestError(
      `Refusing to write to protected branch "${params.branch}"`,
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

  const blobMap = new Map<string, string>();
  for (const file of files) {
    const base64Content =
      file.isBinary === true
        ? file.content
        : Buffer.from(file.content, 'utf-8').toString('base64');
    const blob = await octokit.git.createBlob({
      owner: params.owner,
      repo: params.repo,
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
    owner: params.owner,
    repo: params.repo,
    base_tree: baseCommit.data.tree.sha,
    tree,
  });

  const commitResponse = await octokit.git.createCommit({
    owner: params.owner,
    repo: params.repo,
    message: params.commitMessage,
    tree: treeResponse.data.sha,
    parents: [baseCommitSha],
  });

  try {
    await octokit.git.createRef({
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${params.branch}`,
      sha: commitResponse.data.sha,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create branch';
    throw new GitHubDraftPullRequestError(
      `Could not create branch "${params.branch}": ${message}`,
      { status: 400, code: 'BRANCH_CREATE_FAILED' },
    );
  }

  const pull = await octokit.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.prTitle,
    body: params.prBody,
    head: params.branch,
    base: baseBranch,
    draft: params.draft,
  });

  return {
    prUrl: pull.data.html_url,
    prNumber: pull.data.number,
    branch: params.branch,
    commitSha: commitResponse.data.sha,
    filesCreated: files.length,
    baseBranch,
  };
}
