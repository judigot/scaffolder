import type { IStructure } from '@/components/FileViewer.tsx';
import { convertPublicRepoFilesToStructure } from '@/utils/convertPublicRepoFilesToIStructure.ts';
import { fetchPinnedRepoTarball } from '@/utils/fetchPinnedRepoTarball.ts';
import {
  applyTemplateSubdirectory,
  isCommitSha,
  parseTemplateRepo,
  type IParsedTemplateRepo,
} from '@/utils/parseTemplateRepo.ts';
import {
  GitHubSnapshotError,
  resolveGitHubSnapshot,
  type IGitHubSnapshotLookup,
  type IResolvedGitHubSnapshot,
} from '@/utils/resolveGitHubSnapshot.ts';

export type TemplateBaseErrorCode =
  | 'INVALID_TEMPLATE_REPO'
  | 'UNSUPPORTED_TEMPLATE_BASE'
  | 'TEMPLATE_BASE_NOT_FETCHED'
  | 'TEMPLATE_SOURCE_UNAVAILABLE'
  | 'TEMPLATE_SUBDIRECTORY_NOT_FOUND';

export class TemplateBaseError extends Error {
  readonly code: TemplateBaseErrorCode;

  constructor(message: string, code: TemplateBaseErrorCode) {
    super(message);
    this.name = 'TemplateBaseError';
    this.code = code;
  }
}

export type IResolvedTemplateBase =
  | { kind: 'none' }
  | { kind: 'local'; path: string }
  | { kind: 'remote'; url: string; parsed: IParsedTemplateRepo };

export interface IFetchResolvedRemoteBaseOptions {
  loadTemplateFiles?: (templateRepo: string) => Promise<IStructure>;
  snapshotLookup?: IGitHubSnapshotLookup;
  fetchImpl?: typeof fetch;
}

function looksLikeRemoteBase(value: string): boolean {
  return /github\.com\//i.test(value) || /^https?:\/\//i.test(value);
}

function wrapParseTemplateRepo(url: string): IParsedTemplateRepo {
  try {
    return parseTemplateRepo(url);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid template_repo';
    throw new TemplateBaseError(message, 'INVALID_TEMPLATE_REPO');
  }
}

function snapshotFromCommitRef(
  parsed: IParsedTemplateRepo,
): IResolvedGitHubSnapshot | null {
  if (
    parsed.ref?.length !== 40 ||
    !isCommitSha(parsed.ref)
  ) {
    return null;
  }
  return {
    owner: parsed.owner,
    repo: parsed.repo,
    requestedRef: parsed.ref,
    resolvedRef: parsed.ref,
    resolvedSha: parsed.ref.toLowerCase(),
  };
}

async function resolveRemoteSnapshot(
  parsed: IParsedTemplateRepo,
  snapshotLookup: IGitHubSnapshotLookup | undefined,
): Promise<IResolvedGitHubSnapshot> {
  if (snapshotLookup !== undefined) {
    try {
      return await resolveGitHubSnapshot(parsed, snapshotLookup);
    } catch (error: unknown) {
      if (error instanceof GitHubSnapshotError) {
        throw new TemplateBaseError(
          error.message,
          'TEMPLATE_SOURCE_UNAVAILABLE',
        );
      }
      throw error;
    }
  }

  const fromRef = snapshotFromCommitRef(parsed);
  if (fromRef !== null) {
    return fromRef;
  }

  try {
    return await resolveGitHubSnapshot(parsed);
  } catch (error: unknown) {
    if (error instanceof GitHubSnapshotError) {
      throw new TemplateBaseError(error.message, 'TEMPLATE_SOURCE_UNAVAILABLE');
    }
    throw error;
  }
}

/**
 * Request `template_repo` wins over recipe `$BASE` / `source`.
 * Local paths must start with `/`. Remote GitHub URLs are resolved to one
 * commit snapshot at fetch time.
 */
export function resolveTemplateBase(
  requestOverride: string | undefined,
  recipeBase: string | null | undefined,
): IResolvedTemplateBase {
  const override = requestOverride?.trim();
  if (override !== undefined && override !== '') {
    return {
      kind: 'remote',
      url: override,
      parsed: wrapParseTemplateRepo(override),
    };
  }

  const authorBase = recipeBase?.trim();
  if (authorBase === undefined || authorBase === '') {
    return { kind: 'none' };
  }

  if (authorBase.startsWith('/')) {
    return { kind: 'local', path: authorBase };
  }

  if (looksLikeRemoteBase(authorBase)) {
    return {
      kind: 'remote',
      url: authorBase,
      parsed: wrapParseTemplateRepo(authorBase),
    };
  }

  throw new TemplateBaseError(
    `Unsupported $BASE / source "${authorBase}". Use a local /Core path or a github.com repository URL.`,
    'UNSUPPORTED_TEMPLATE_BASE',
  );
}

export async function fetchResolvedRemoteBase(
  resolved: Extract<IResolvedTemplateBase, { kind: 'remote' }>,
  loadTemplateFiles?: (templateRepo: string) => Promise<IStructure>,
  options: IFetchResolvedRemoteBaseOptions = {},
): Promise<{ layer: IStructure; resolvedSha: string; sha: string }> {
  const snapshot = await resolveRemoteSnapshot(
    resolved.parsed,
    options.snapshotLookup,
  );

  const loader = options.loadTemplateFiles ?? loadTemplateFiles;
  if (loader !== undefined) {
    return {
      layer: await loader(resolved.url),
      resolvedSha: snapshot.resolvedSha,
      sha: snapshot.resolvedSha,
    };
  }

  const files = await fetchPinnedRepoTarball(
    {
      owner: resolved.parsed.owner,
      repo: resolved.parsed.repo,
      sha: snapshot.resolvedSha,
    },
    options.fetchImpl,
  );

  try {
    const scoped = applyTemplateSubdirectory(
      files,
      resolved.parsed.subdirectory,
    );
    return {
      layer: convertPublicRepoFilesToStructure(scoped),
      resolvedSha: snapshot.resolvedSha,
      sha: snapshot.resolvedSha,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'template_repo subdirectory was not found';
    throw new TemplateBaseError(message, 'TEMPLATE_SUBDIRECTORY_NOT_FOUND');
  }
}
