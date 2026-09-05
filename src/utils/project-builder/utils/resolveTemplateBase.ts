import type { IStructure } from '@/components/FileViewer.tsx';
import { convertPublicRepoFilesToStructure } from '@/utils/convertPublicRepoFilesToIStructure.ts';
import { fetchPinnedRepoTarball } from '@/utils/fetchPinnedRepoTarball.ts';
import {
  parseTemplateRepo,
  type IParsedTemplateRepo,
} from '@/utils/parseTemplateRepo.ts';

export type TemplateBaseErrorCode =
  | 'INVALID_TEMPLATE_REPO'
  | 'TEMPLATE_REPO_UNPINNED'
  | 'UNSUPPORTED_TEMPLATE_BASE'
  | 'TEMPLATE_BASE_NOT_FETCHED';

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

function looksLikeRemoteBase(value: string): boolean {
  return /github\.com\//i.test(value) || /^https?:\/\//i.test(value);
}

function wrapParseTemplateRepo(url: string): IParsedTemplateRepo {
  try {
    return parseTemplateRepo(url);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Invalid template_repo';
    if (/unpinned/i.test(message)) {
      throw new TemplateBaseError(message, 'TEMPLATE_REPO_UNPINNED');
    }
    throw new TemplateBaseError(message, 'INVALID_TEMPLATE_REPO');
  }
}

/**
 * Request `template_repo` wins over recipe `$BASE` / `source`.
 * Local paths must start with `/`. Remote GitHub URLs must be pinned.
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
    `Unsupported $BASE / source "${authorBase}". Use a local /Core path or a pinned GitHub template URL.`,
    'UNSUPPORTED_TEMPLATE_BASE',
  );
}

export async function fetchResolvedRemoteBase(
  resolved: Extract<IResolvedTemplateBase, { kind: 'remote' }>,
  loadTemplateFiles?: (templateRepo: string) => Promise<IStructure>,
): Promise<{ layer: IStructure; sha: string }> {
  if (loadTemplateFiles !== undefined) {
    return {
      layer: await loadTemplateFiles(resolved.url),
      sha: resolved.parsed.sha,
    };
  }

  const files = await fetchPinnedRepoTarball(resolved.parsed);
  return {
    layer: convertPublicRepoFilesToStructure(files),
    sha: resolved.parsed.sha,
  };
}
