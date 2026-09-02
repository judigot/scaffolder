import { describe, expect, it, vi } from 'vitest';
import {
  GitHubDraftPullRequestError,
  publishDraftPullRequest,
  type IGitHubGitClient,
} from '@/app/services/githubDraftPullRequestService.ts';

function createGitClient(
  overrides: {
    defaultBranch?: string;
    createRef?: IGitHubGitClient['git']['createRef'];
    updateRef?: () => Promise<unknown>;
  } = {},
): IGitHubGitClient {
  const git: IGitHubGitClient['git'] & {
    updateRef?: () => Promise<unknown>;
  } = {
    getRef: () => Promise.resolve({ data: { object: { sha: 'base-commit' } } }),
    getCommit: () => Promise.resolve({ data: { tree: { sha: 'base-tree' } } }),
    createBlob: () => Promise.resolve({ data: { sha: 'blob-sha' } }),
    createTree: () => Promise.resolve({ data: { sha: 'new-tree' } }),
    createCommit: () => Promise.resolve({ data: { sha: 'commit-sha' } }),
    createRef:
      overrides.createRef ??
      (() => Promise.resolve({ data: { ref: 'refs/heads/scaffolder/test' } })),
  };

  if (overrides.updateRef !== undefined) {
    git.updateRef = overrides.updateRef;
  }

  return {
    repos: {
      get: () =>
        Promise.resolve({
          data: { default_branch: overrides.defaultBranch ?? 'main' },
        }),
    },
    git,
    pulls: {
      create: () =>
        Promise.resolve({
          data: {
            html_url: 'https://github.com/judigot/bookingwars/pull/7',
            number: 7,
          },
        }),
    },
  };
}

describe('publishDraftPullRequest', () => {
  it('refuses to write to the default branch', async () => {
    await expect(
      publishDraftPullRequest(
        {
          owner: 'judigot',
          repo: 'bookingwars',
          branch: 'main',
          structure: [{ type: 'file', name: 'README.md', content: 'hello' }],
          commitMessage: 'feat: scaffold',
          prTitle: 'Scaffold',
          prBody: 'draft',
          draft: true,
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

    const result = await publishDraftPullRequest(
      {
        owner: 'judigot',
        repo: 'bookingwars',
        branch: 'scaffolder/hono-react-ab12',
        structure: [{ type: 'file', name: 'README.md', content: 'hello' }],
        commitMessage: 'feat: scaffold hono-react',
        prTitle: 'Scaffold hono-react',
        prBody: 'Draft PR',
        draft: true,
      },
      {
        getOctokit: () =>
          Promise.resolve(
            createGitClient({
              createRef,
              updateRef,
            }),
          ),
      },
    );

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
    });
  });

  it('returns a typed error when no files were generated', async () => {
    await expect(
      publishDraftPullRequest(
        {
          owner: 'judigot',
          repo: 'bookingwars',
          branch: 'scaffolder/empty',
          structure: [],
          commitMessage: 'feat: scaffold',
          prTitle: 'Scaffold',
          prBody: 'draft',
          draft: true,
        },
        {
          getOctokit: () => Promise.resolve(createGitClient()),
        },
      ),
    ).rejects.toBeInstanceOf(GitHubDraftPullRequestError);
  });
});
