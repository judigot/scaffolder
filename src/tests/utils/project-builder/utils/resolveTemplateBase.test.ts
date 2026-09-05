import { describe, expect, it } from 'vitest';
import {
  resolveTemplateBase,
  TemplateBaseError,
} from '@/utils/project-builder/utils/resolveTemplateBase.ts';

const PINNED_SHA = '0123456789abcdef0123456789abcdef01234567';
const PINNED_URL = `https://github.com/judigot/template-monorepo/tree/${PINNED_SHA}`;
const OVERRIDE_URL = `https://github.com/judigot/template-monorepo/commit/${PINNED_SHA}`;

describe('resolveTemplateBase', () => {
  it('prefers the request override over a recipe remote $BASE', () => {
    expect(resolveTemplateBase(OVERRIDE_URL, PINNED_URL)).toEqual({
      kind: 'remote',
      url: OVERRIDE_URL,
      parsed: {
        owner: 'judigot',
        repo: 'template-monorepo',
        sha: PINNED_SHA,
      },
    });
  });

  it('resolves a remote recipe $BASE when no override is set', () => {
    expect(resolveTemplateBase(undefined, PINNED_URL)).toEqual({
      kind: 'remote',
      url: PINNED_URL,
      parsed: {
        owner: 'judigot',
        repo: 'template-monorepo',
        sha: PINNED_SHA,
      },
    });
  });

  it('resolves a local /Core $BASE', () => {
    expect(resolveTemplateBase(undefined, '/Core/template-monorepo')).toEqual({
      kind: 'local',
      path: '/Core/template-monorepo',
    });
  });

  it('returns none when both override and recipe base are omitted', () => {
    expect(resolveTemplateBase(undefined, null)).toEqual({ kind: 'none' });
  });

  it('rejects an unpinned remote recipe $BASE', () => {
    expect(() =>
      resolveTemplateBase(
        undefined,
        'https://github.com/judigot/template-monorepo/tree/main',
      ),
    ).toThrow(TemplateBaseError);
    try {
      resolveTemplateBase(
        undefined,
        'https://github.com/judigot/template-monorepo/tree/main',
      );
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: 'TEMPLATE_REPO_UNPINNED' });
    }
  });

  it('rejects an unsupported non-path, non-GitHub $BASE', () => {
    expect(() => resolveTemplateBase(undefined, 'not-a-base')).toThrow(
      /Unsupported \$BASE/,
    );
  });
});
