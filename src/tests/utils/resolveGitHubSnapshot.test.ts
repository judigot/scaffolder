import { describe, expect, it, vi } from 'vitest';
import {
  GitHubSnapshotError,
  resolveGitHubSnapshot,
  type IGitHubSnapshotLookup,
} from '@/utils/resolveGitHubSnapshot.ts';

const DEVELOP_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const RELEASE_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function createLookup(
  overrides: Partial<IGitHubSnapshotLookup> = {},
): IGitHubSnapshotLookup {
  return {
    getDefaultBranch: vi.fn(() => Promise.resolve('develop')),
    getCommitSha: vi.fn((owner: string, repo: string, ref: string) => {
      if (ref === 'develop') {
        return Promise.resolve(DEVELOP_SHA);
      }
      if (ref === 'release-1') {
        return Promise.resolve(RELEASE_SHA);
      }
      return Promise.reject(
        new GitHubSnapshotError(
          `GitHub ref "${ref}" on ${owner}/${repo} is unavailable (HTTP 404).`,
        ),
      );
    }),
    ...overrides,
  };
}

describe('resolveGitHubSnapshot', () => {
  it('resolves a bare repo URL from the actual default branch metadata', async () => {
    const lookup = createLookup();
    const snapshot = await resolveGitHubSnapshot(
      { owner: 'acme', repo: 'public-starter', ref: null },
      lookup,
    );

    expect(lookup.getDefaultBranch).toHaveBeenCalledWith(
      'acme',
      'public-starter',
    );
    expect(lookup.getCommitSha).toHaveBeenCalledWith(
      'acme',
      'public-starter',
      'develop',
    );
    expect(lookup.getCommitSha).not.toHaveBeenCalledWith(
      'acme',
      'public-starter',
      'main',
    );
    expect(snapshot).toEqual({
      owner: 'acme',
      repo: 'public-starter',
      requestedRef: null,
      resolvedRef: 'develop',
      resolvedSha: DEVELOP_SHA,
      defaultBranch: 'develop',
    });
  });

  it('resolves an explicit branch without looking up the default branch', async () => {
    const lookup = createLookup();
    const snapshot = await resolveGitHubSnapshot(
      { owner: 'judigot', repo: 'template-monorepo', ref: 'release-1' },
      lookup,
    );

    expect(lookup.getDefaultBranch).not.toHaveBeenCalled();
    expect(lookup.getCommitSha).toHaveBeenCalledTimes(1);
    expect(snapshot.resolvedSha).toBe(RELEASE_SHA);
    expect(snapshot.resolvedRef).toBe('release-1');
  });

  it('surfaces an unavailable public repository as a typed error', async () => {
    const lookup = createLookup({
      getDefaultBranch: () =>
        Promise.reject(
          new GitHubSnapshotError(
            'GitHub repository missing/starter is unavailable (HTTP 404; not found or not public).',
          ),
        ),
    });

    await expect(
      resolveGitHubSnapshot(
        { owner: 'missing', repo: 'starter', ref: null },
        lookup,
      ),
    ).rejects.toMatchObject({
      name: 'GitHubSnapshotError',
      code: 'SOURCE_UNAVAILABLE',
    });
  });
});
