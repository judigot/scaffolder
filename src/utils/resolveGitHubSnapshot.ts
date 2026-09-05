import { isRecord } from '@/utils/typeGuards.ts';

export interface IGitHubSnapshotSource {
  owner: string;
  repo: string;
  ref: string | null;
}

export interface IResolvedGitHubSnapshot {
  owner: string;
  repo: string;
  requestedRef: string | null;
  resolvedRef: string;
  resolvedSha: string;
  defaultBranch?: string;
}

export interface IGitHubSnapshotLookup {
  getDefaultBranch: (owner: string, repo: string) => Promise<string>;
  getCommitSha: (owner: string, repo: string, ref: string) => Promise<string>;
}

export class GitHubSnapshotError extends Error {
  readonly code: 'SOURCE_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'GitHubSnapshotError';
    this.code = 'SOURCE_UNAVAILABLE';
  }
}

function githubHeaders(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'scaffolder',
  };
}

function readDefaultBranch(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  const defaultBranch = payload.default_branch;
  if (typeof defaultBranch !== 'string') {
    return null;
  }
  const trimmed = defaultBranch.trim();
  return trimmed === '' ? null : trimmed;
}

function readCommitSha(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  const sha = payload.sha;
  if (typeof sha !== 'string') {
    return null;
  }
  const trimmed = sha.trim();
  if (trimmed === '' || !/^[0-9a-f]{7,40}$/i.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}

function unavailableSource(
  owner: string,
  repo: string,
  ref: string | null,
  status: number,
): GitHubSnapshotError {
  if (ref === null) {
    return new GitHubSnapshotError(
      `GitHub repository ${owner}/${repo} is unavailable (HTTP ${String(status)}; not found or not public).`,
    );
  }
  return new GitHubSnapshotError(
    `GitHub ref "${ref}" on ${owner}/${repo} is unavailable (HTTP ${String(status)}).`,
  );
}

export function createGitHubSnapshotLookup(
  fetchImpl: typeof fetch = fetch,
): IGitHubSnapshotLookup {
  return {
    async getDefaultBranch(owner, repo) {
      const response = await fetchImpl(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers: githubHeaders() },
      );
      if (!response.ok) {
        throw unavailableSource(owner, repo, null, response.status);
      }
      const defaultBranch = readDefaultBranch(await response.json());
      if (defaultBranch === null) {
        throw new GitHubSnapshotError(
          `GitHub repository ${owner}/${repo} did not return a default branch.`,
        );
      }
      return defaultBranch;
    },
    async getCommitSha(owner, repo, ref) {
      const response = await fetchImpl(
        `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`,
        { headers: githubHeaders() },
      );
      if (!response.ok) {
        throw unavailableSource(owner, repo, ref, response.status);
      }
      const sha = readCommitSha(await response.json());
      if (sha === null) {
        throw new GitHubSnapshotError(
          `GitHub ref "${ref}" on ${owner}/${repo} did not resolve to a commit SHA.`,
        );
      }
      return sha;
    },
  };
}

const defaultLookup = createGitHubSnapshotLookup();

export async function resolveGitHubSnapshot(
  source: IGitHubSnapshotSource,
  lookup: IGitHubSnapshotLookup = defaultLookup,
): Promise<IResolvedGitHubSnapshot> {
  try {
    if (source.ref === null || source.ref === '') {
      const defaultBranch = await lookup.getDefaultBranch(
        source.owner,
        source.repo,
      );
      const resolvedSha = await lookup.getCommitSha(
        source.owner,
        source.repo,
        defaultBranch,
      );
      return {
        owner: source.owner,
        repo: source.repo,
        requestedRef: null,
        resolvedRef: defaultBranch,
        resolvedSha,
        defaultBranch,
      };
    }

    const resolvedSha = await lookup.getCommitSha(
      source.owner,
      source.repo,
      source.ref,
    );
    return {
      owner: source.owner,
      repo: source.repo,
      requestedRef: source.ref,
      resolvedRef: source.ref,
      resolvedSha,
    };
  } catch (error: unknown) {
    if (error instanceof GitHubSnapshotError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'GitHub snapshot lookup failed';
    throw new GitHubSnapshotError(
      `GitHub repository ${source.owner}/${source.repo} is unavailable (${message}).`,
    );
  }
}
