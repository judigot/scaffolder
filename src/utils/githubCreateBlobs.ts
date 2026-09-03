import pLimit from 'p-limit';

export const GITHUB_BLOB_CONCURRENCY = 10;
export const GITHUB_BLOB_MAX_RETRIES = 5;
export const GITHUB_BLOB_RETRY_BASE_DELAY_MS = 1000;
export const GITHUB_BLOB_UPLOAD_TIMEOUT_MS = 120_000;

export interface IGitFileToBlob {
  path: string;
  content: string;
  isBinary?: boolean;
}

export interface ICreateGitBlobParams {
  owner: string;
  repo: string;
  content: string;
  encoding: 'base64';
}

export interface IGitBlobApi {
  createBlob: (
    params: ICreateGitBlobParams,
  ) => Promise<{ data: { sha: string } }>;
}

export class GitBlobUploadError extends Error {
  readonly code: 'BLOB_UPLOAD_FAILED' | 'GITHUB_PUBLISH_TIMEOUT';
  readonly path?: string;

  constructor(
    message: string,
    options: {
      code: 'BLOB_UPLOAD_FAILED' | 'GITHUB_PUBLISH_TIMEOUT';
      path?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'GitBlobUploadError';
    this.code = options.code;
    this.path = options.path;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export interface ICreateGitBlobsOptions {
  concurrency?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  timeoutMs?: number;
  delay?: (ms: number) => Promise<void>;
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

function isRetryableBlobError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }
  if (status === 403) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : '';
    return (
      message.includes('rate limit') ||
      message.includes('secondary rate limit') ||
      message.includes('abuse detection')
    );
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('secondary rate limit') ||
      message.includes('abuse detection') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('fetch failed') ||
      message.includes('socket hang up')
    );
  }
  return false;
}

function encodeBlobContent(file: IGitFileToBlob): string {
  if (file.isBinary === true) {
    return file.content;
  }
  return Buffer.from(file.content, 'utf-8').toString('base64');
}

async function createBlobWithRetry(
  api: IGitBlobApi,
  owner: string,
  repo: string,
  file: IGitFileToBlob,
  maxRetries: number,
  retryBaseDelayMs: number,
  delay: (ms: number) => Promise<void>,
  attempt = 0,
): Promise<{ path: string; sha: string }> {
  try {
    const response = await api.createBlob({
      owner,
      repo,
      content: encodeBlobContent(file),
      encoding: 'base64',
    });
    return { path: file.path, sha: response.data.sha };
  } catch (error: unknown) {
    if (isRetryableBlobError(error) && attempt < maxRetries) {
      const backoffMs =
        retryBaseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await delay(backoffMs);
      return createBlobWithRetry(
        api,
        owner,
        repo,
        file,
        maxRetries,
        retryBaseDelayMs,
        delay,
        attempt + 1,
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new GitBlobUploadError(
      `Failed to create blob for ${file.path}: ${message}`,
      { code: 'BLOB_UPLOAD_FAILED', path: file.path, cause: error },
    );
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fileCount: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new GitBlobUploadError(
          `Timed out after ${String(timeoutMs)}ms while uploading ${String(fileCount)} Git blobs. No branch or pull request was created.`,
          { code: 'GITHUB_PUBLISH_TIMEOUT' },
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function createGitBlobsWithRetry(
  api: IGitBlobApi,
  owner: string,
  repo: string,
  files: IGitFileToBlob[],
  options: ICreateGitBlobsOptions = {},
): Promise<Map<string, string>> {
  const concurrency = options.concurrency ?? GITHUB_BLOB_CONCURRENCY;
  const maxRetries = options.maxRetries ?? GITHUB_BLOB_MAX_RETRIES;
  const retryBaseDelayMs =
    options.retryBaseDelayMs ?? GITHUB_BLOB_RETRY_BASE_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? GITHUB_BLOB_UPLOAD_TIMEOUT_MS;
  const delay = options.delay ?? defaultDelay;
  const limit = pLimit(concurrency);

  const uploadAll = Promise.all(
    files.map((file) =>
      limit(() => {
        return createBlobWithRetry(
          api,
          owner,
          repo,
          file,
          maxRetries,
          retryBaseDelayMs,
          delay,
        );
      }),
    ),
  );

  const blobResults = await withTimeout(uploadAll, timeoutMs, files.length);
  const blobMap = new Map<string, string>();
  for (const result of blobResults) {
    blobMap.set(result.path, result.sha);
  }
  return blobMap;
}
