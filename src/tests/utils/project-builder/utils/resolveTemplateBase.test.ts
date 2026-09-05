import { describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'fflate';
import {
  fetchResolvedRemoteBase,
  resolveTemplateBase,
  TemplateBaseError,
} from '@/utils/project-builder/utils/resolveTemplateBase.ts';
import type { IGitHubSnapshotLookup } from '@/utils/resolveGitHubSnapshot.ts';

const BARE_URL = 'https://github.com/judigot/template-monorepo';
const OVERRIDE_URL = 'https://github.com/acme/public-starter';
const BRANCH_URL =
  'https://github.com/judigot/template-monorepo/tree/release-1';
const DEVELOP_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const RELEASE_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const BLOCK = 512;

function writeString(block: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    block[offset + index] = value.charCodeAt(index);
  }
}

function writeOctal(
  block: Uint8Array,
  offset: number,
  length: number,
  value: number,
): void {
  const text = value.toString(8).padStart(length - 1, '0');
  writeString(block, offset, text);
}

function checksum(header: Uint8Array): number {
  let sum = 0;
  for (const byte of header) {
    sum += byte;
  }
  return sum;
}

function createTarGz(files: { path: string; content: string }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const file of files) {
    const content = new TextEncoder().encode(file.content);
    const header = new Uint8Array(BLOCK);
    writeString(header, 0, file.path);
    writeOctal(header, 124, 12, content.length);
    header[156] = '0'.charCodeAt(0);
    writeString(header, 257, 'ustar');
    writeString(header, 148, '        ');
    const sum = checksum(header);
    writeOctal(header, 148, 8, sum);
    chunks.push(header);
    const padded = new Uint8Array(Math.ceil(content.length / BLOCK) * BLOCK);
    padded.set(content);
    chunks.push(padded);
  }
  chunks.push(new Uint8Array(BLOCK * 2));
  const total = chunks.reduce((size, chunk) => size + chunk.length, 0);
  const tar = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    tar.set(chunk, offset);
    offset += chunk.length;
  }
  return gzipSync(tar);
}

function createLookup(
  shaByRef: Record<string, string>,
  defaultBranch = 'develop',
): IGitHubSnapshotLookup {
  return {
    getDefaultBranch: vi.fn(() => Promise.resolve(defaultBranch)),
    getCommitSha: vi.fn((_owner: string, _repo: string, ref: string) => {
      if (!Object.hasOwn(shaByRef, ref)) {
        return Promise.reject(new Error(`unexpected ref ${ref}`));
      }
      return Promise.resolve(shaByRef[ref]);
    }),
  };
}

describe('resolveTemplateBase', () => {
  it('prefers the request override over a recipe remote $BASE', () => {
    expect(resolveTemplateBase(OVERRIDE_URL, BARE_URL)).toEqual({
      kind: 'remote',
      url: OVERRIDE_URL,
      parsed: {
        owner: 'acme',
        repo: 'public-starter',
        ref: null,
        subdirectory: null,
      },
    });
  });

  it('resolves a remote recipe $BASE when no override is set', () => {
    expect(resolveTemplateBase(undefined, BARE_URL)).toEqual({
      kind: 'remote',
      url: BARE_URL,
      parsed: {
        owner: 'judigot',
        repo: 'template-monorepo',
        ref: null,
        subdirectory: null,
      },
    });
  });

  it('accepts an explicit branch URL without treating main as unpinned', () => {
    expect(
      resolveTemplateBase(
        undefined,
        'https://github.com/judigot/template-monorepo/tree/main',
      ),
    ).toEqual({
      kind: 'remote',
      url: 'https://github.com/judigot/template-monorepo/tree/main',
      parsed: {
        owner: 'judigot',
        repo: 'template-monorepo',
        ref: 'main',
        subdirectory: null,
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

  it('rejects an unsupported non-path, non-GitHub $BASE', () => {
    expect(() => resolveTemplateBase(undefined, 'not-a-base')).toThrow(
      /Unsupported \$BASE/,
    );
  });

  it('rejects a non-github remote $BASE', () => {
    expect(() =>
      resolveTemplateBase(undefined, 'https://gitlab.com/acme/starter'),
    ).toThrow(TemplateBaseError);
    try {
      resolveTemplateBase(undefined, 'https://gitlab.com/acme/starter');
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: 'INVALID_TEMPLATE_REPO' });
    }
  });
});

describe('fetchResolvedRemoteBase', () => {
  it('resolves a bare URL to one tarball snapshot via non-main default branch metadata', async () => {
    const lookup = createLookup({ develop: DEVELOP_SHA });
    const archive = createTarGz([
      {
        path: 'template-monorepo-aaaa/README.md',
        content: '# starter',
      },
    ]);
    const fetchImpl: typeof fetch = (input) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      expect(url).toBe(
        `https://codeload.github.com/judigot/template-monorepo/tar.gz/${DEVELOP_SHA}`,
      );
      return Promise.resolve(
        new Response(Buffer.from(archive), {
          status: 200,
          headers: { 'content-type': 'application/gzip' },
        }),
      );
    };

    const resolved = resolveTemplateBase(BARE_URL, undefined);
    if (resolved.kind !== 'remote') {
      throw new Error('expected remote base');
    }

    const fetched = await fetchResolvedRemoteBase(resolved, undefined, {
      snapshotLookup: lookup,
      fetchImpl,
    });

    expect(lookup.getDefaultBranch).toHaveBeenCalledTimes(1);
    expect(lookup.getCommitSha).toHaveBeenCalledTimes(1);
    expect(lookup.getCommitSha).toHaveBeenCalledWith(
      'judigot',
      'template-monorepo',
      'develop',
    );
    expect(fetched.resolvedSha).toBe(DEVELOP_SHA);
    expect(fetched.sha).toBe(DEVELOP_SHA);
    expect(fetched.layer).toEqual([
      {
        type: 'file',
        name: 'README.md',
        content: '# starter',
        isBinary: false,
      },
    ]);
  });

  it('fetches an explicit branch URL at the resolved commit once', async () => {
    const lookup = createLookup({ 'release-1': RELEASE_SHA });
    const archive = createTarGz([
      {
        path: 'template-monorepo-bbbb/app.txt',
        content: 'from-release',
      },
    ]);
    const fetchImpl: typeof fetch = (input) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      expect(url).toBe(
        `https://codeload.github.com/judigot/template-monorepo/tar.gz/${RELEASE_SHA}`,
      );
      return Promise.resolve(
        new Response(Buffer.from(archive), {
          status: 200,
          headers: { 'content-type': 'application/gzip' },
        }),
      );
    };

    const resolved = resolveTemplateBase(BRANCH_URL, undefined);
    if (resolved.kind !== 'remote') {
      throw new Error('expected remote base');
    }

    const fetched = await fetchResolvedRemoteBase(resolved, undefined, {
      snapshotLookup: lookup,
      fetchImpl,
    });

    expect(lookup.getDefaultBranch).not.toHaveBeenCalled();
    expect(lookup.getCommitSha).toHaveBeenCalledTimes(1);
    expect(fetched.resolvedSha).toBe(RELEASE_SHA);
    expect(fetched.layer).toEqual([
      {
        type: 'file',
        name: 'app.txt',
        content: 'from-release',
        isBinary: false,
      },
    ]);
  });

  it('honors a subdirectory snapshot and does not return the repo root', async () => {
    const lookup = createLookup({ develop: DEVELOP_SHA });
    const archive = createTarGz([
      {
        path: 'starter-aaaa/README.md',
        content: 'root',
      },
      {
        path: 'starter-aaaa/packages/web/package.json',
        content: '{"name":"web"}',
      },
    ]);
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(
        new Response(Buffer.from(archive), {
          status: 200,
          headers: { 'content-type': 'application/gzip' },
        }),
      );

    const resolved = resolveTemplateBase(
      'https://github.com/acme/public-starter/tree/develop/packages/web',
      undefined,
    );
    if (resolved.kind !== 'remote') {
      throw new Error('expected remote base');
    }

    const fetched = await fetchResolvedRemoteBase(resolved, undefined, {
      snapshotLookup: lookup,
      fetchImpl,
    });

    expect(fetched.layer).toEqual([
      {
        type: 'file',
        name: 'package.json',
        content: '{"name":"web"}',
        isBinary: false,
      },
    ]);
  });

  it('rejects a missing subdirectory instead of substituting the repo root', async () => {
    const lookup = createLookup({ develop: DEVELOP_SHA });
    const archive = createTarGz([
      {
        path: 'starter-aaaa/README.md',
        content: 'root',
      },
    ]);
    const fetchImpl: typeof fetch = () =>
      Promise.resolve(
        new Response(Buffer.from(archive), {
          status: 200,
          headers: { 'content-type': 'application/gzip' },
        }),
      );

    const resolved = resolveTemplateBase(
      'https://github.com/acme/public-starter/tree/develop/packages/missing',
      undefined,
    );
    if (resolved.kind !== 'remote') {
      throw new Error('expected remote base');
    }

    await expect(
      fetchResolvedRemoteBase(resolved, undefined, {
        snapshotLookup: lookup,
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: 'TEMPLATE_SUBDIRECTORY_NOT_FOUND',
    });
  });
});
