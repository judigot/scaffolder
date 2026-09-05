import { parseTemplateRepo } from '@/utils/parseTemplateRepo.ts';

export interface IParsedProjectReference {
  owner: string | null;
  repo: string | null;
  ref: string | null;
  filesRepoUrl: string | null;
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

const PROJECT_URL_HINT =
  'project_url must be a GitHub URL to Projects/<name> in a scaffolder-files repo (for example https://github.com/owner/scaffolder-files/tree/main/Projects/ORM Schema - Knex). Legacy project folder names are still accepted.';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function decodeUriPath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeProjectFolder(folderPath: string): string {
  let normalized = trimSlashes(decodeUriPath(folderPath));
  if (normalized.endsWith('/structure.yaml')) {
    normalized = normalized.slice(0, -'/structure.yaml'.length);
  }
  if (normalized.startsWith('Projects/')) {
    normalized = normalized.slice('Projects/'.length);
  }
  const projectName = trimSlashes(normalized);
  if (projectName === '' || projectName.includes('/')) {
    throw new Error(PROJECT_URL_HINT);
  }
  return projectName;
}

export function toScaffolderFilesRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

export function usesBundledScaffolderFiles(
  projectReference: IParsedProjectReference,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (projectReference.owner === null || projectReference.repo === null) {
    return true;
  }
  const bundledOwner = (
    env.SCAFFOLDER_BUNDLED_FILES_OWNER ?? 'judigot'
  ).toLowerCase();
  const bundledRepo = (
    env.SCAFFOLDER_BUNDLED_FILES_REPO ?? 'scaffolder-files'
  ).toLowerCase();
  return (
    projectReference.owner.toLowerCase() === bundledOwner &&
    projectReference.repo.toLowerCase() === bundledRepo
  );
}

export function shouldFetchRemoteScaffolderFiles(
  projectReference: IParsedProjectReference,
): boolean {
  if (projectReference.owner === null || projectReference.repo === null) {
    return false;
  }
  return true;
}

function createProjectReference(params: {
  owner: string | null;
  repo: string | null;
  ref: string | null;
  projectName: string;
}): IParsedProjectReference {
  const filesRepoUrl =
    params.owner !== null && params.repo !== null
      ? toScaffolderFilesRepoUrl(params.owner, params.repo)
      : null;
  return {
    owner: params.owner,
    repo: params.repo,
    ref: params.ref,
    filesRepoUrl,
    projectName: params.projectName,
    projectYamlPath: `/Projects/${params.projectName}/structure.yaml`,
  };
}

export function parseProjectReference(
  project: string,
): IParsedProjectReference {
  const trimmed = project.trim();
  if (trimmed === '') {
    throw new Error('project_url is required');
  }

  if (/^https?:/i.test(trimmed) || /github\.com/i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error(PROJECT_URL_HINT);
    }
    const parts = url.pathname.replace(/\/$/, '').split('/').slice(1);
    const [owner = '', repo = '', kind] = parts;
    const root = `${url.origin}/${owner}/${repo}`;
    if (
      url.username !== '' ||
      url.password !== '' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      throw new Error(PROJECT_URL_HINT);
    }
    let source = parseTemplateRepo(root);
    let projectPath: string;
    if (kind === 'Projects') {
      projectPath = parts.slice(2).join('/');
    } else {
      const suffix = parts.slice(3);
      const marker =
        suffix.length - (suffix.at(-1) === 'structure.yaml' ? 3 : 2);
      if (
        (kind !== 'tree' && kind !== 'blob') ||
        marker < 1 ||
        suffix[marker] !== 'Projects'
      ) {
        throw new Error(PROJECT_URL_HINT);
      }
      const ref = decodeUriPath(suffix.slice(0, marker).join('/'));
      source = parseTemplateRepo(`${root}/tree/${encodeURIComponent(ref)}`);
      projectPath = suffix.slice(marker).join('/');
    }
    return createProjectReference({
      owner: source.owner,
      repo: source.repo,
      ref: source.ref,
      projectName: normalizeProjectFolder(projectPath),
    });
  }

  return createProjectReference({
    owner: null,
    repo: null,
    ref: null,
    projectName: normalizeProjectFolder(trimmed),
  });
}

export function parseTargetRepo(targetRepo: string): IParsedTargetRepo {
  const trimmed = targetRepo.trim();
  if (trimmed === '') {
    throw new Error('target_repo is required');
  }

  if (/^https?:/i.test(trimmed)) {
    const parsed = parseTemplateRepo(trimmed);
    if (parsed.ref !== null || parsed.subdirectory !== null) {
      throw new Error('target_repo must point to a repository root.');
    }
    return { owner: parsed.owner, repo: parsed.repo };
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
