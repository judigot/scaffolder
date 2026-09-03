import { describe, expect, it, vi } from 'vitest';
import { createGitBlobsWithRetry } from '@/utils/githubCreateBlobs.ts';
import type { IGitBlobApi } from '@/utils/githubCreateBlobs.ts';

function createFiles(count: number): { path: string; content: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    path: `file-${String(index)}.txt`,
    content: `content-${String(index)}`,
  }));
}

describe('createGitBlobsWithRetry', () => {
  it('uploads blobs in parallel up to the concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const createBlob = vi.fn(() => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise<{ data: { sha: string } }>((resolve) => {
        setTimeout(() => {
          inFlight -= 1;
          resolve({ data: { sha: 'blob-sha' } });
        }, 40);
      });
    });
    const api: IGitBlobApi = { createBlob };

    const blobMap = await createGitBlobsWithRetry(
      api,
      'judigot',
      'bookingwars',
      createFiles(20),
      { concurrency: 10, timeoutMs: 5000 },
    );

    expect(blobMap.size).toBe(20);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(10);
    expect(createBlob).toHaveBeenCalledTimes(20);
  });

  it('retries retryable blob failures with backoff', async () => {
    let attempts = 0;
    const delay = vi.fn(() => Promise.resolve());
    const createBlob = vi.fn(() => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('secondary rate limit');
        Object.assign(error, { status: 403 });
        return Promise.reject(error);
      }
      return Promise.resolve({ data: { sha: 'blob-sha' } });
    });

    const blobMap = await createGitBlobsWithRetry(
      apiFrom(createBlob),
      'judigot',
      'bookingwars',
      [{ path: 'README.md', content: 'hello' }],
      { delay, retryBaseDelayMs: 10, timeoutMs: 5000 },
    );

    expect(blobMap.get('README.md')).toBe('blob-sha');
    expect(createBlob).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
  });

  it('fails cleanly without creating blobs past a timeout', async () => {
    const createBlob = vi.fn(
      () =>
        new Promise<{ data: { sha: string } }>(() => {
          return;
        }),
    );

    await expect(
      createGitBlobsWithRetry(
        apiFrom(createBlob),
        'judigot',
        'bookingwars',
        [{ path: 'slow.bin', content: 'x', isBinary: true }],
        { timeoutMs: 30 },
      ),
    ).rejects.toMatchObject({
      code: 'GITHUB_PUBLISH_TIMEOUT',
      name: 'GitBlobUploadError',
    });
  });

  it('wraps exhausted retries as BLOB_UPLOAD_FAILED', async () => {
    const delay = vi.fn(() => Promise.resolve());
    const createBlob = vi.fn(() => {
      const error = new Error('Server Error');
      Object.assign(error, { status: 502 });
      return Promise.reject(error);
    });

    await expect(
      createGitBlobsWithRetry(
        apiFrom(createBlob),
        'judigot',
        'bookingwars',
        [{ path: 'README.md', content: 'hello' }],
        { delay, maxRetries: 1, retryBaseDelayMs: 1, timeoutMs: 5000 },
      ),
    ).rejects.toMatchObject({
      code: 'BLOB_UPLOAD_FAILED',
      name: 'GitBlobUploadError',
    });
  });
});

function apiFrom(createBlob: IGitBlobApi['createBlob']): IGitBlobApi {
  return { createBlob };
}
