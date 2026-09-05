import type { IExtractedFile } from '@/utils/downloadPublicRepoFiles.ts';

export interface IParsedTemplateRepo {
  owner: string;
  repo: string;
  ref: string | null;
  subdirectory: string | null;
}

export interface ITemplateRepoSnapshot {
  owner: string;
  repo: string;
  sha: string;
}

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const GITHUB_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export const TEMPLATE_REPO_HINT =
  'template_repo must be a github.com repository URL (for example https://github.com/judigot/template-monorepo). Optional /tree/<branch|tag|sha> and /commit/<sha> are accepted.';

function stripUrlSuffix(value: string): string {
  const withoutHash = value.split('#')[0] ?? value;
  return withoutHash.split('?')[0] ?? withoutHash;
}

function decodeUriPath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(TEMPLATE_REPO_HINT);
  }
}

function isValidGitHubName(value: string): boolean {
  return GITHUB_NAME_PATTERN.test(value) && value !== '.' && value !== '..';
}

export function isCommitSha(ref: string): boolean {
  const trimmed = ref.trim();
  if (trimmed === '') {
    return false;
  }
  return SHA_PATTERN.test(trimmed);
}

function normalizeSubdirectory(value: string): string | null {
  const normalized = value.replace(/^\/+|\/+$/g, '');
  if (normalized === '') {
    return null;
  }
  const parts = normalized.split('/').filter((part) => part !== '');
  if (parts.some((part) => part === '.' || part === '..')) {
    throw new Error(
      'template_repo subdirectory must be a safe repository-relative path',
    );
  }
  return parts.join('/');
}

export function parseTemplateRepo(value: string): IParsedTemplateRepo {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(stripUrlSuffix(trimmed));
  } catch {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.port !== '' ||
    parsedUrl.username !== '' ||
    parsedUrl.password !== ''
  ) {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (!GITHUB_HOSTS.has(host)) {
    throw new Error(
      `template_repo must use the github.com host (received "${parsedUrl.hostname}").`,
    );
  }

  const pathParts = parsedUrl.pathname
    .split('/')
    .filter((part) => part !== '')
    .map((part) => decodeUriPath(part));
  const [owner = '', rawRepo = '', ...extraParts] = pathParts;
  if (owner === '' || rawRepo === '') {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  const repo = rawRepo.replace(/\.git$/, '');
  if (!isValidGitHubName(owner) || !isValidGitHubName(repo)) {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  if (extraParts.length === 0) {
    return { owner, repo, ref: null, subdirectory: null };
  }

  const [kindRaw = '', rawRef = '', ...subdirectoryParts] = extraParts;
  const kind = kindRaw.toLowerCase();
  if (kind === 'blob') {
    throw new Error(
      'template_repo cannot be a file blob URL. Use the repository URL or a /tree/<ref> folder URL.',
    );
  }

  if (kind !== 'tree' && kind !== 'commit') {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  if (
    rawRef === '' ||
    /[\s?#\\]/.test(rawRef) ||
    rawRef
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  const subdirectory = normalizeSubdirectory(subdirectoryParts.join('/'));
  if (kind === 'commit' && subdirectory !== null) {
    throw new Error(
      'template_repo commit URLs cannot include a subdirectory. Use /tree/<ref>/<subdir> instead.',
    );
  }

  return {
    owner,
    repo,
    ref: rawRef,
    subdirectory,
  };
}

export function applyTemplateSubdirectory(
  files: IExtractedFile[],
  subdirectory: string | null,
): IExtractedFile[] {
  if (subdirectory === null || subdirectory === '') {
    return files;
  }

  const prefix = `${subdirectory}/`;
  const filtered: IExtractedFile[] = [];
  for (const file of files) {
    if (file.path === subdirectory) {
      const name = file.path.split('/').pop();
      if (name !== undefined && name !== '') {
        filtered.push({ ...file, path: name });
      }
      continue;
    }
    if (file.path.startsWith(prefix)) {
      filtered.push({
        ...file,
        path: file.path.slice(prefix.length),
      });
    }
  }

  if (filtered.length === 0) {
    throw new Error(
      `template_repo subdirectory "${subdirectory}" was not found in the repository snapshot. The repository root was not substituted.`,
    );
  }

  return filtered;
}
