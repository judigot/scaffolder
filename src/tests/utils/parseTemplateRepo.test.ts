import { describe, expect, it } from 'vitest';
import {
  applyTemplateSubdirectory,
  isCommitSha,
  parseTemplateRepo,
} from '@/utils/parseTemplateRepo.ts';

const PINNED_SHA = '0123456789abcdef0123456789abcdef01234567';

describe('isCommitSha', () => {
  it('accepts full and abbreviated hex SHAs', () => {
    expect(isCommitSha(PINNED_SHA)).toBe(true);
    expect(isCommitSha('0123456')).toBe(true);
  });

  it('does not treat branch names as commit SHAs', () => {
    expect(isCommitSha('main')).toBe(false);
    expect(isCommitSha('develop')).toBe(false);
    expect(isCommitSha('release-1')).toBe(false);
  });
});

describe('parseTemplateRepo', () => {
  it.each([
    'http://github.com/alice/starter',
    'https://token@github.com/alice/starter',
    'https://github.com:8443/alice/starter',
    'https://github.com.evil.test/alice/starter',
    'https://github.com/alice/starter/tree/%ZZ',
  ])('rejects unsafe URLs: %s', (url) => {
    expect(() => parseTemplateRepo(url)).toThrow();
  });

  it('parses a bare GitHub repository URL', () => {
    expect(
      parseTemplateRepo('https://github.com/judigot/template-monorepo'),
    ).toEqual({
      owner: 'judigot',
      repo: 'template-monorepo',
      ref: null,
      subdirectory: null,
    });
  });

  it('parses a different owner public repository URL', () => {
    expect(
      parseTemplateRepo('https://github.com/acme/public-starter.git'),
    ).toEqual({
      owner: 'acme',
      repo: 'public-starter',
      ref: null,
      subdirectory: null,
    });
  });

  it('parses an explicit branch tree URL', () => {
    expect(
      parseTemplateRepo(
        'https://github.com/judigot/template-monorepo/tree/release-1',
      ),
    ).toEqual({
      owner: 'judigot',
      repo: 'template-monorepo',
      ref: 'release-1',
      subdirectory: null,
    });
  });

  it('accepts main as an ordinary branch ref', () => {
    expect(
      parseTemplateRepo(
        'https://github.com/judigot/template-monorepo/tree/main',
      ),
    ).toEqual({
      owner: 'judigot',
      repo: 'template-monorepo',
      ref: 'main',
      subdirectory: null,
    });
  });

  it('parses a commit URL', () => {
    expect(
      parseTemplateRepo(
        `https://github.com/judigot/template-monorepo/commit/${PINNED_SHA}`,
      ),
    ).toEqual({
      owner: 'judigot',
      repo: 'template-monorepo',
      ref: PINNED_SHA,
      subdirectory: null,
    });
  });

  it('honors a tree subdirectory instead of dropping it', () => {
    expect(
      parseTemplateRepo(
        'https://github.com/acme/public-starter/tree/develop/packages/web',
      ),
    ).toEqual({
      owner: 'acme',
      repo: 'public-starter',
      ref: 'develop',
      subdirectory: 'packages/web',
    });
  });

  it('rejects a non-github host', () => {
    expect(() =>
      parseTemplateRepo('https://gitlab.com/acme/public-starter'),
    ).toThrow(/github\.com host/);
  });

  it('rejects a file blob URL', () => {
    expect(() =>
      parseTemplateRepo(
        'https://github.com/acme/public-starter/blob/main/package.json',
      ),
    ).toThrow(/cannot be a file blob URL/);
  });

  it('rejects an invalid repository path', () => {
    expect(() => parseTemplateRepo('https://github.com/acme')).toThrow(
      /github\.com repository URL/,
    );
  });
});

describe('applyTemplateSubdirectory', () => {
  const files = [
    { path: 'README.md', content: 'root', isBinary: false },
    { path: 'packages/web/package.json', content: '{}', isBinary: false },
    {
      path: 'packages/web/src/index.ts',
      content: 'export {}',
      isBinary: false,
    },
  ];

  it('returns the repository root when no subdirectory is selected', () => {
    expect(applyTemplateSubdirectory(files, null)).toEqual(files);
  });

  it('scopes extracted files to the selected subdirectory', () => {
    expect(applyTemplateSubdirectory(files, 'packages/web')).toEqual([
      { path: 'package.json', content: '{}', isBinary: false },
      { path: 'src/index.ts', content: 'export {}', isBinary: false },
    ]);
  });

  it('rejects a missing subdirectory instead of returning the repo root', () => {
    expect(() => applyTemplateSubdirectory(files, 'packages/missing')).toThrow(
      /was not found in the repository snapshot/,
    );
  });
});
