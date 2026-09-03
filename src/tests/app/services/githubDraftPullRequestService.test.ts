import { describe, expect, it, vi } from 'vitest';
import {
  GitHubDraftPullRequestError,
  publishDraftPullRequest,
  type IGitHubGitClient,
  type IGitHubPullRequest,
} from '@/app/services/githubDraftPullRequestService.ts';

class GitHubHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const existingPull: IGitHubPullRequest = {
  html_url: 'https://github.com/judigot/bookingwars/pull/2',
  number: 2,
  state: 'open',
  draft: true,
  merged: false,
  head: {
    ref: 'scaffolder/hono-react-ab12',
    sha: 'existing-head',
    repo: { full_name: 'judigot/bookingwars' },
  },
  base: {
    ref: 'main',
    repo: { full_name: 'judigot/bookingwars' },
  },
};

const createParams = {
  owner: 'judigot',
  repo: 'bookingwars',
  branch: 'scaffolder/hono-react-ab12',
  structure: [{ type: 'file' as const, name: 'README.md', content: 'hello' }],
  commitMessage: 'feat: scaffold hono-react',
  prTitle: 'Scaffold hono-react',
  prBody: 'Draft PR',
  draft: true,
};

function createGitClient(
  overrides: {
    defaultBranch?: string;
    existingBranches?: Record<string, { sha: string; treeSha: string }>;
    createRef?: IGitHubGitClient['git']['createRef'];
    updateRef?: IGitHubGitClient['git']['updateRef'];
    createTreeSha?: string;
    createCommitSha?: string;
    openPulls?: IGitHubPullRequest[];
    pullByNumber?: Record<number, IGitHubPullRequest>;
  } = {},
): IGitHubGitClient {
  const defaultBranch = overrides.defaultBranch ?? 'main';
  const existingBranches = overrides.existingBranches ?? {};

  return {
    repos: {
      get: () =>
        Promise.resolve({
          data: { default_branch: defaultBranch },
        }),
    },
    git: {
      getRef: (params) => {
        const branchName = params.ref.replace(/^heads\//, '');
        if (Object.hasOwn(existingBranches, branchName)) {
          const existing = existingBranches[branchName];
          return Promise.resolve({ data: { object: { sha: existing.sha } } });
        }
        if (branchName === defaultBranch) {
          return Promise.resolve({
            data: { object: { sha: 'base-commit' } },
          });
        }
        return Promise.reject(new GitHubHttpError(404, 'Not Found'));
      },
      getCommit: (params) => {
        for (const existing of Object.values(existingBranches)) {
          if (existing.sha === params.commit_sha) {
            return Promise.resolve({
              data: { tree: { sha: existing.treeSha } },
            });
          }
        }
        return Promise.resolve({ data: { tree: { sha: 'base-tree' } } });
      },
      createBlob: () => Promise.resolve({ data: { sha: 'blob-sha' } }),
      createTree: () =>
        Promise.resolve({
          data: { sha: overrides.createTreeSha ?? 'new-tree' },
        }),
      createCommit: () =>
        Promise.resolve({
          data: { sha: overrides.createCommitSha ?? 'commit-sha' },
        }),
      createRef:
        overrides.createRef ??
        (() =>
          Promise.resolve({ data: { ref: 'refs/heads/scaffolder/test' } })),
      updateRef:
        overrides.updateRef ??
        (() => {
          throw new Error('updateRef should not run on create-only path');
        }),
    },
    pulls: {
      create: () =>
        Promise.resolve({
          data: {
            html_url: 'https://github.com/judigot/bookingwars/pull/7',
            number: 7,
          },
        }),
      get: (params) => {
        const pull = overrides.pullByNumber?.[params.pull_number];
        if (pull === undefined) {
          return Promise.reject(new GitHubHttpError(404, 'Not Found'));
        }
        return Promise.resolve({ data: pull });
      },
      list: () => Promise.resolve({ data: overrides.openPulls ?? [] }),
    },
  };
}

describe('publishDraftPullRequest', () => {
  it('refuses to write to the default branch', async () => {
    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          branch: 'main',
        },
        {
          getOctokit: () => Promise.resolve(createGitClient()),
        },
      ),
    ).rejects.toMatchObject({
      code: 'PROTECTED_BRANCH',
      status: 400,
    });
  });

  it('creates a new branch and draft pull request without updating existing refs', async () => {
    const createRef = vi.fn(() =>
      Promise.resolve({
        data: { ref: 'refs/heads/scaffolder/hono-react-ab12' },
      }),
    );
    const updateRef = vi.fn(() => {
      throw new Error('should not force-update refs');
    });

    const result = await publishDraftPullRequest(createParams, {
      getOctokit: () =>
        Promise.resolve(
          createGitClient({
            createRef,
            updateRef,
          }),
        ),
    });

    expect(createRef).toHaveBeenCalledWith({
      owner: 'judigot',
      repo: 'bookingwars',
      ref: 'refs/heads/scaffolder/hono-react-ab12',
      sha: 'commit-sha',
    });
    expect(updateRef).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      prUrl: 'https://github.com/judigot/bookingwars/pull/7',
      prNumber: 7,
      branch: 'scaffolder/hono-react-ab12',
      filesCreated: 1,
      baseBranch: 'main',
      updated: false,
    });
  });

  it('creates a blob for every generated file', async () => {
    const createBlob = vi.fn(() => Promise.resolve({ data: { sha: 'blob-sha' } }));
    const client = createGitClient();
    client.git.createBlob = createBlob;

    const result = await publishDraftPullRequest(
      {
        ...createParams,
        structure: [
          { type: 'file', name: 'README.md', content: 'hello' },
          { type: 'file', name: 'index.ts', content: 'export {};' },
          { type: 'file', name: 'schema.ts', content: 'export const t = 1;' },
        ],
      },
      {
        getOctokit: () => Promise.resolve(client),
      },
    );

    expect(createBlob).toHaveBeenCalledTimes(3);
    expect(result.filesCreated).toBe(3);
  });

  it('returns a typed error when no files were generated', async () => {
    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          branch: 'scaffolder/empty',
          structure: [],
        },
        {
          getOctokit: () => Promise.resolve(createGitClient()),
        },
      ),
    ).rejects.toBeInstanceOf(GitHubDraftPullRequestError);
  });

  it('commits onto an existing branch and returns the open PR', async () => {
    const createCommit = vi.fn(() =>
      Promise.resolve({ data: { sha: 'second-commit' } }),
    );
    const updateRef = vi.fn(() =>
      Promise.resolve({ data: { object: { sha: 'second-commit' } } }),
    );
    const createRef = vi.fn(() => {
      throw new Error('should not create a colliding branch');
    });
    const createPull = vi.fn(() => {
      throw new Error('should not open a second PR');
    });

    const client = createGitClient({
      existingBranches: {
        'scaffolder/hono-react-ab12': {
          sha: 'existing-head',
          treeSha: 'existing-tree',
        },
      },
      createTreeSha: 'updated-tree',
      updateRef,
      createRef,
      openPulls: [existingPull],
    });
    client.git.createCommit = createCommit;
    client.pulls.create = createPull;

    const result = await publishDraftPullRequest(
      {
        ...createParams,
        updateExisting: true,
      },
      {
        getOctokit: () => Promise.resolve(client),
      },
    );

    expect(createCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        parents: ['existing-head'],
        tree: 'updated-tree',
      }),
    );
    expect(updateRef).toHaveBeenCalledWith({
      owner: 'judigot',
      repo: 'bookingwars',
      ref: 'heads/scaffolder/hono-react-ab12',
      sha: 'second-commit',
      force: false,
    });
    expect(createRef).not.toHaveBeenCalled();
    expect(createPull).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      prUrl: existingPull.html_url,
      prNumber: 2,
      branch: 'scaffolder/hono-react-ab12',
      commitSha: 'second-commit',
      updated: true,
    });
  });

  it('opens a draft PR when the branch exists without one', async () => {
    const updateRef = vi.fn(() =>
      Promise.resolve({ data: { object: { sha: 'second-commit' } } }),
    );
    const createPull = vi.fn(() =>
      Promise.resolve({
        data: {
          html_url: 'https://github.com/judigot/bookingwars/pull/9',
          number: 9,
        },
      }),
    );
    const client = createGitClient({
      existingBranches: {
        'scaffolder/hono-react-ab12': {
          sha: 'existing-head',
          treeSha: 'existing-tree',
        },
      },
      createCommitSha: 'second-commit',
      updateRef,
      openPulls: [],
    });
    client.pulls.create = createPull;

    const result = await publishDraftPullRequest(
      {
        ...createParams,
        updateExisting: true,
      },
      {
        getOctokit: () => Promise.resolve(client),
      },
    );

    expect(createPull).toHaveBeenCalledWith(
      expect.objectContaining({
        head: 'scaffolder/hono-react-ab12',
        draft: true,
      }),
    );
    expect(result).toMatchObject({
      prUrl: 'https://github.com/judigot/bookingwars/pull/9',
      prNumber: 9,
      updated: true,
    });
  });

  it('resolves the head branch from prNumber when branch is omitted', async () => {
    const updateRef = vi.fn(() =>
      Promise.resolve({ data: { object: { sha: 'second-commit' } } }),
    );
    const client = createGitClient({
      existingBranches: {
        'scaffolder/hono-react-ab12': {
          sha: 'existing-head',
          treeSha: 'existing-tree',
        },
      },
      createTreeSha: 'updated-tree',
      createCommitSha: 'second-commit',
      updateRef,
      pullByNumber: { 2: existingPull },
      openPulls: [existingPull],
    });

    const result = await publishDraftPullRequest(
      {
        ...createParams,
        branch: undefined,
        updateExisting: true,
        prNumber: 2,
      },
      {
        getOctokit: () => Promise.resolve(client),
      },
    );

    expect(updateRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'heads/scaffolder/hono-react-ab12',
        force: false,
      }),
    );
    expect(result).toMatchObject({
      prNumber: 2,
      branch: 'scaffolder/hono-react-ab12',
      updated: true,
    });
  });

  it('rejects a closed or merged pull request', async () => {
    const closedPull: IGitHubPullRequest = {
      ...existingPull,
      state: 'closed',
      merged: true,
    };

    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          updateExisting: true,
          prNumber: 2,
        },
        {
          getOctokit: () =>
            Promise.resolve(
              createGitClient({
                pullByNumber: { 2: closedPull },
              }),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'PR_NOT_OPEN',
      status: 400,
    });
  });

  it('rejects a pull request whose head is a protected branch', async () => {
    const protectedPull: IGitHubPullRequest = {
      ...existingPull,
      head: {
        ref: 'main',
        sha: 'main-head',
        repo: { full_name: 'judigot/bookingwars' },
      },
    };

    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          branch: 'main',
          updateExisting: true,
          prNumber: 2,
        },
        {
          getOctokit: () =>
            Promise.resolve(
              createGitClient({
                pullByNumber: { 2: protectedPull },
              }),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'PROTECTED_BRANCH',
      status: 400,
    });
  });

  it('rejects a missing pull request number on the target repo', async () => {
    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          updateExisting: true,
          prNumber: 99,
        },
        {
          getOctokit: () =>
            Promise.resolve(
              createGitClient({
                pullByNumber: {},
              }),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'PR_NOT_FOUND',
      status: 400,
    });
  });

  it('rejects a pull request that belongs to another repository', async () => {
    const foreignPull: IGitHubPullRequest = {
      ...existingPull,
      html_url: 'https://github.com/other/repo/pull/2',
      head: {
        ref: 'scaffolder/hono-react-ab12',
        sha: 'existing-head',
        repo: { full_name: 'other/repo' },
      },
      base: {
        ref: 'main',
        repo: { full_name: 'other/repo' },
      },
    };

    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          updateExisting: true,
          prNumber: 2,
        },
        {
          getOctokit: () =>
            Promise.resolve(
              createGitClient({
                pullByNumber: { 2: foreignPull },
              }),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'PR_REPO_MISMATCH',
      status: 400,
    });
  });

  it('rejects branch and prNumber that point at different heads', async () => {
    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          branch: 'scaffolder/other-head',
          updateExisting: true,
          prNumber: 2,
        },
        {
          getOctokit: () =>
            Promise.resolve(
              createGitClient({
                pullByNumber: { 2: existingPull },
              }),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'BRANCH_PR_MISMATCH',
      status: 400,
    });
  });

  it('fails when updating the ref would require a force-push', async () => {
    const updateRef = vi.fn(() =>
      Promise.reject(new GitHubHttpError(422, 'Update is not a fast forward')),
    );

    await expect(
      publishDraftPullRequest(
        {
          ...createParams,
          updateExisting: true,
        },
        {
          getOctokit: () =>
            Promise.resolve(
              createGitClient({
                existingBranches: {
                  'scaffolder/hono-react-ab12': {
                    sha: 'existing-head',
                    treeSha: 'existing-tree',
                  },
                },
                createTreeSha: 'diverged-tree',
                updateRef,
              }),
            ),
        },
      ),
    ).rejects.toMatchObject({
      code: 'BRANCH_UPDATE_FAILED',
      status: 400,
    });

    expect(updateRef).toHaveBeenCalledWith(
      expect.objectContaining({ force: false }),
    );
  });

  it('returns the current commit when the generated tree matches HEAD', async () => {
    const createCommit = vi.fn(() =>
      Promise.resolve({ data: { sha: 'should-not-commit' } }),
    );
    const updateRef = vi.fn(() => {
      throw new Error('should not update an identical tree');
    });
    const client = createGitClient({
      existingBranches: {
        'scaffolder/hono-react-ab12': {
          sha: 'existing-head',
          treeSha: 'existing-tree',
        },
      },
      createTreeSha: 'existing-tree',
      updateRef,
      openPulls: [existingPull],
    });
    client.git.createCommit = createCommit;

    const result = await publishDraftPullRequest(
      {
        ...createParams,
        updateExisting: true,
      },
      {
        getOctokit: () => Promise.resolve(client),
      },
    );

    expect(createCommit).not.toHaveBeenCalled();
    expect(updateRef).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      prUrl: existingPull.html_url,
      prNumber: 2,
      commitSha: 'existing-head',
      updated: true,
    });
  });
});
