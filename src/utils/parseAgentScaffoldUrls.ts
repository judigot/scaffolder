export interface IParsedProjectReference {
  owner: string | null;
  repo: string | null;
  ref: string | null;
  projectName: string;
  projectYamlPath: string;
}

export interface IParsedTargetRepo {
  owner: string;
  repo: string;
}

export interface IParsedPullRequestUrl {
  owner: string;
  repo: string;
  prNumber: number;
}

const PROTECTED_BRANCH_NAMES = new Set(['main', 'master', 'head']);

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function normalizeProjectFolder(folderPath: string): string {
  let normalized = trimSlashes(folderPath);
  if (normalized.endsWith('/structure.yaml')) {
    normalized = normalized.slice(0, -'/structure.yaml'.length);
  }
  if (normalized.startsWith('Projects/')) {
    normalized = normalized.slice('Projects/'.length);
  }
  const projectName = trimSlashes(normalized);
  if (projectName === '' || projectName.includes('/')) {
    throw new Error(
      'project must be a GitHub tree URL, Projects/<name>, or a project folder name',
    );
  }
  return projectName;
}

export function parseProjectReference(
  project: string,
): IParsedProjectReference {
  const trimmed = project.trim();
  if (trimmed === '') {
    throw new Error('project is required');
  }

  const treeMatch = /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/.exec(
    trimmed,
  );
  if (treeMatch !== null) {
    const owner = treeMatch[1];
    const repo = treeMatch[2];
    const ref = treeMatch[3];
    const folderPath = treeMatch[4];
    const projectName = normalizeProjectFolder(folderPath);
    return {
      owner,
      repo: repo.replace(/\.git$/, ''),
      ref,
      projectName,
      projectYamlPath: `/Projects/${projectName}/structure.yaml`,
    };
  }

  const projectName = normalizeProjectFolder(trimmed);
  return {
    owner: null,
    repo: null,
    ref: null,
    projectName,
    projectYamlPath: `/Projects/${projectName}/structure.yaml`,
  };
}

export function parseTargetRepo(targetRepo: string): IParsedTargetRepo {
  const trimmed = targetRepo.trim();
  if (trimmed === '') {
    throw new Error('target_repo is required');
  }

  const urlMatch = /github\.com\/([^/]+)\/([^/]+)/.exec(trimmed);
  if (urlMatch !== null) {
    const owner = urlMatch[1];
    const rawRepo = urlMatch[2];
    return {
      owner,
      repo: rawRepo.replace(/\.git$/, '').replace(/\/$/, ''),
    };
  }

  const shorthandMatch = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(trimmed);
  if (shorthandMatch !== null) {
    const owner = shorthandMatch[1];
    const repo = shorthandMatch[2];
    return { owner, repo };
  }

  throw new Error(
    'target_repo must be a GitHub URL or owner/repo (for example judigot/bookingwars)',
  );
}

export function isSameTargetRepo(
  left: IParsedTargetRepo,
  right: IParsedTargetRepo,
): boolean {
  return (
    left.owner.toLowerCase() === right.owner.toLowerCase() &&
    left.repo.toLowerCase() === right.repo.toLowerCase()
  );
}

export function parsePullRequestUrl(prUrl: string): IParsedPullRequestUrl {
  const trimmed = prUrl.trim();
  if (trimmed === '') {
    throw new Error('prUrl must be a GitHub pull request URL');
  }

  const match =
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/pull\/(\d+)(?:\/|$|\?)/.exec(
      trimmed,
    );
  if (match === null) {
    throw new Error(
      'prUrl must be a GitHub pull request URL (for example https://github.com/owner/repo/pull/2)',
    );
  }

  const [, owner = '', rawRepo = '', prNumberRaw = ''] = match;
  if (owner === '' || rawRepo === '' || prNumberRaw === '') {
    throw new Error(
      'prUrl must be a GitHub pull request URL (for example https://github.com/owner/repo/pull/2)',
    );
  }

  const prNumber = Number.parseInt(prNumberRaw, 10);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    throw new Error('prUrl must include a positive pull request number');
  }

  return {
    owner,
    repo: rawRepo.replace(/\/$/, ''),
    prNumber,
  };
}

export function slugifyGitRefSegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isProtectedBranchName(
  branch: string,
  defaultBranch: string,
): boolean {
  const normalized = branch.trim().toLowerCase();
  if (normalized === '') {
    return true;
  }
  if (PROTECTED_BRANCH_NAMES.has(normalized)) {
    return true;
  }
  return normalized === defaultBranch.trim().toLowerCase();
}

export function toScaffolderBranchName(
  projectName: string,
  randomId: string,
): string {
  const sluggedProject = slugifyGitRefSegment(projectName);
  const sluggedId = slugifyGitRefSegment(randomId);
  return `scaffolder/${sluggedProject}-${sluggedId}`;
}

export function ensureScaffolderBranchName(branch: string): string {
  const trimmed = branch.trim();
  const withoutPrefix = trimmed.startsWith('scaffolder/')
    ? trimmed.slice('scaffolder/'.length)
    : trimmed;
  return `scaffolder/${slugifyGitRefSegment(withoutPrefix)}`;
}
