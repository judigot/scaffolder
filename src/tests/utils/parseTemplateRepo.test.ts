import { describe, expect, it } from 'vitest';
import {
  isPinnedCommitSha,
  parseTemplateRepo,
} from '@/utils/parseTemplateRepo.ts';

const PINNED_SHA = '0123456789abcdef0123456789abcdef01234567';
const SHORT_SHA = '0123456';

describe('isPinnedCommitSha', () => {
  it('accepts full and abbreviated hex SHAs', () => {
    expect(isPinnedCommitSha(PINNED_SHA)).toBe(true);
    expect(isPinnedCommitSha(SHORT_SHA)).toBe(true);
  });

  it('rejects unpinned branch names', () => {
    expect(isPinnedCommitSha('main')).toBe(false);
    expect(isPinnedCommitSha('master')).toBe(false);
    expect(isPinnedCommitSha('HEAD')).toBe(false);
    expect(isPinnedCommitSha('develop')).toBe(false);
  });
});

describe('parseTemplateRepo', () => {
  it('parses an allowlisted tree URL with a pinned SHA', () => {
    expect(
      parseTemplateRepo(
        `https://github.com/judigot/template-monorepo/tree/${PINNED_SHA}`,
      ),
    ).toEqual({
      owner: 'judigot',
      repo: 'template-monorepo',
      sha: PINNED_SHA,
    });
  });

  it('parses a commit URL with an abbreviated SHA', () => {
    expect(
      parseTemplateRepo(
        `https://github.com/judigot/template-monorepo/commit/${SHORT_SHA}`,
      ),
    ).toEqual({
      owner: 'judigot',
      repo: 'template-monorepo',
      sha: SHORT_SHA,
    });
  });

  it('rejects an unpinned main tree URL', () => {
    expect(() =>
      parseTemplateRepo(
        'https://github.com/judigot/template-monorepo/tree/main',
      ),
    ).toThrow(/unpinned ref "main"/);
  });

  it('rejects a repo that is not on the allowlist', () => {
    expect(() =>
      parseTemplateRepo(
        `https://github.com/other/template-monorepo/tree/${PINNED_SHA}`,
      ),
    ).toThrow(/not allowlisted/);
  });

  it('rejects a GitHub URL without a pinned ref', () => {
    expect(() =>
      parseTemplateRepo('https://github.com/judigot/template-monorepo'),
    ).toThrow(/pinned commit SHA/);
  });
});
