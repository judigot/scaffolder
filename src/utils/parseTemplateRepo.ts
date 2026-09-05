export interface IParsedTemplateRepo {
  owner: string;
  repo: string;
  sha: string;
}

export const TEMPLATE_REPO_ALLOWLIST = [
  { owner: 'judigot', repo: 'template-monorepo' },
] as const;

const UNPINNED_REFS = new Set(['main', 'master', 'head', 'develop', 'trunk']);
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

const TEMPLATE_REPO_HINT =
  'template_repo must be an allowlisted GitHub URL with a pinned commit SHA (for example https://github.com/judigot/template-monorepo/tree/<sha>). Unpinned refs such as main are rejected.';

function stripUrlSuffix(value: string): string {
  const withoutHash = value.split('#')[0] ?? value;
  return withoutHash.split('?')[0] ?? withoutHash;
}

function decodeUriPath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isPinnedCommitSha(ref: string): boolean {
  const trimmed = ref.trim();
  if (trimmed === '') {
    return false;
  }
  if (UNPINNED_REFS.has(trimmed.toLowerCase())) {
    return false;
  }
  return SHA_PATTERN.test(trimmed);
}

export function isAllowlistedTemplateRepo(
  owner: string,
  repo: string,
): boolean {
  const normalizedOwner = owner.toLowerCase();
  const normalizedRepo = repo.toLowerCase().replace(/\.git$/, '');
  return TEMPLATE_REPO_ALLOWLIST.some(
    (entry) => entry.owner === normalizedOwner && entry.repo === normalizedRepo,
  );
}

export function parseTemplateRepo(value: string): IParsedTemplateRepo {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  const normalizedUrl = stripUrlSuffix(trimmed);
  const treeMatch =
    /github\.com\/([^/]+)\/([^/]+)\/(?:tree|commit|blob)\/([^/]+)/i.exec(
      normalizedUrl,
    );
  if (treeMatch === null) {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  const owner = treeMatch[1];
  const rawRepo = treeMatch[2];
  const rawRef = decodeUriPath(treeMatch[3]);
  const repo = rawRepo.replace(/\.git$/, '');

  if (owner === '' || repo === '') {
    throw new Error(TEMPLATE_REPO_HINT);
  }

  if (!isAllowlistedTemplateRepo(owner, repo)) {
    throw new Error(
      `template_repo ${owner}/${repo} is not allowlisted. Allowed: ${TEMPLATE_REPO_ALLOWLIST.map((entry) => `${entry.owner}/${entry.repo}`).join(', ')}`,
    );
  }

  if (!isPinnedCommitSha(rawRef)) {
    throw new Error(
      `template_repo must pin a commit SHA. Refusing unpinned ref "${rawRef}".`,
    );
  }

  return {
    owner,
    repo,
    sha: rawRef.toLowerCase(),
  };
}
