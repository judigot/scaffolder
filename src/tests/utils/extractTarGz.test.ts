import { describe, expect, it } from 'vitest';
import { gzipSync } from 'fflate';
import { extractTarGz } from '@/utils/extractTarGz.ts';
import { fetchPinnedRepoTarball } from '@/utils/fetchPinnedRepoTarball.ts';

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

describe('extractTarGz', () => {
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
