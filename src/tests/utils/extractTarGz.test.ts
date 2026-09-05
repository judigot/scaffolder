import { describe, expect, it } from 'vitest';
import { createTarGz } from '@/tests/helpers/createTarGz.ts';
import { extractTarGz } from '@/utils/extractTarGz.ts';
import { fetchPinnedRepoTarball } from '@/utils/fetchPinnedRepoTarball.ts';

describe('extractTarGz', () => {
  it('extracts text and binary files without a Node Buffer global', () => {
    const archive = createTarGz([
      { path: 'root/file.txt', content: 'text' },
      { path: 'root/icon.png', content: 'binary' },
    ]);
    const originalBuffer = globalThis.Buffer;
    try {
      Reflect.set(globalThis, 'Buffer', undefined);
      expect(extractTarGz(archive)).toEqual([
        { path: 'file.txt', content: 'text', isBinary: false },
        { path: 'icon.png', content: btoa('binary'), isBinary: true },
      ]);
    } finally {
      globalThis.Buffer = originalBuffer;
    }
  });
  it.each([
    'root/../escape.ts',
    'root/a/../../escape.ts',
    'root/.git/config',
    '/root/file.ts',
  ])('rejects unsafe paths: %s', (path) => {
    expect(() =>
      extractTarGz(createTarGz([{ path, content: 'unsafe' }])),
    ).toThrow(/Unsafe/);
  });

  it('extracts files and strips the archive root folder', () => {
    const archive = createTarGz([
      {
        path: 'template-monorepo-abc123/apps/api/package.json',
        content: '{"name":"api","dependencies":{"hono":"^4.0.0"}}',
      },
      {
        path: 'template-monorepo-abc123/README.md',
        content: '# starter',
      },
    ]);

    const files = extractTarGz(archive);
    expect(files.map((file) => file.path).sort()).toEqual([
      'README.md',
      'apps/api/package.json',
    ]);
    expect(files.find((file) => file.path === 'README.md')?.content).toBe(
      '# starter',
    );
  });
});

describe('fetchPinnedRepoTarball', () => {
  it('downloads the GitHub tarball URL for a pinned SHA', async () => {
    const archive = createTarGz([
      {
        path: 'template-monorepo-deadbeef/package.json',
        content: '{"name":"template-monorepo"}',
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
        'https://codeload.github.com/judigot/template-monorepo/tar.gz/deadbeef',
      );
      return Promise.resolve(
        new Response(Buffer.from(archive), {
          status: 200,
          headers: { 'content-type': 'application/gzip' },
        }),
      );
    };

    const files = await fetchPinnedRepoTarball(
      { owner: 'judigot', repo: 'template-monorepo', sha: 'deadbeef' },
      fetchImpl,
    );
    expect(files).toEqual([
      {
        path: 'package.json',
        content: '{"name":"template-monorepo"}',
        isBinary: false,
      },
    ]);
  });
});
