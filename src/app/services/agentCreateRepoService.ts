import { Octokit } from '@octokit/rest';
import { createGitHubRepositoryService } from '@/app/services/createGitHubRepositoryService.ts';
import {
  getGitHubAppConfig,
  getGitHubAppOctokit,
  getInstallationUrl,
} from '@/app/services/githubAppService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';
import { AGENT_AUTH_SUBJECT } from '@/utils/verifyAgentScaffoldAuth.ts';
import type { IParsedTargetRepo } from '@/utils/parseAgentScaffoldUrls.ts';

export type IAgentCreateRepoStatus = 400 | 403 | 409 | 500;

export class AgentCreateRepoError extends Error {
  readonly status: IAgentCreateRepoStatus;
  readonly code: string;
  readonly details?: unknown;
  readonly installationUrl?: string;

  constructor(
    message: string,
    options: {
      status: IAgentCreateRepoStatus;
      code: string;
      details?: unknown;
      installationUrl?: string;
    },
  ) {
    super(message);
    this.name = 'AgentCreateRepoError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.installationUrl = options.installationUrl;
  }
}

export type IGitHubOwnerType = 'User' | 'Organization' | 'unknown';

export interface IAgentCreateRepoResult {
  created: boolean;
  repoUrl: string;
  ownerType: IGitHubOwnerType;
}

export interface IAgentCreateRepoDependencies {
  getOwnerType?: (owner: string) => Promise<IGitHubOwnerType>;
  repoExists?: (owner: string, repo: string) => Promise<boolean>;
  getStoredUserToken?: (auth0UserId: string) => Promise<string | null>;
  createRepository?: (params: {
    owner: string;
    repoName: string;
    isPrivate: boolean;
    autoInit: boolean;
    auth0UserId?: string;
    method?: 'personal_token' | 'github_app';
  }) => Promise<{ success: boolean; message: string; repoUrl?: string }>;
  verifyAppWriteAccess?: (owner: string, repo: string) => Promise<void>;
}

async function defaultGetOwnerType(owner: string): Promise<IGitHubOwnerType> {
  try {
    const publicOctokit = new Octokit();
    const { data } = await publicOctokit.users.getByUsername({
      username: owner,
    });
    if (data.type === 'User' || data.type === 'Organization') {
      return data.type;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function defaultRepoExists(
  owner: string,
  repo: string,
): Promise<boolean> {
  try {
    const publicOctokit = new Octokit();
    await publicOctokit.repos.get({ owner, repo });
    return true;
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 404
    ) {
      return false;
    }
    return false;
  }
}

async function defaultVerifyAppWriteAccess(
  owner: string,
  repo: string,
): Promise<void> {
  const appConfig = getGitHubAppConfig();
  if (appConfig === null) {
    throw new AgentCreateRepoError(
      'GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.',
      { status: 500, code: 'GITHUB_APP_NOT_CONFIGURED' },
    );
  }

  try {
    const octokit = await getGitHubAppOctokit(appConfig, { owner, repo });
    const repoResponse = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoResponse.data.default_branch;
    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
  } catch (error: unknown) {
    const installationUrl = await getInstallationUrl(owner);
    const message =
      error instanceof Error
        ? error.message
        : `GitHub App cannot write to ${owner}/${repo}`;
    throw new AgentCreateRepoError(
      `${message}. Install the Scaffolder GitHub App on this repository (all repos, or create-as-App for organizations) so it can open a draft PR.`,
      {
        status: 403,
        code: 'GITHUB_APP_NOT_INSTALLED',
        installationUrl,
      },
    );
  }
}

function hasUsableUserIdentity(auth0UserId: string | undefined): boolean {
  if (auth0UserId === undefined || auth0UserId === '') {
    return false;
  }
  return auth0UserId !== AGENT_AUTH_SUBJECT;
}

function createdRepoAppAccessRecovery(repoUrl: string): {
  repoCreated: true;
  repoUrl: string;
  recovery: string;
} {
  return {
    repoCreated: true,
    repoUrl,
    recovery:
      'The destination repository was created. Grant the Scaffolder GitHub App access, then retry with create_repo: false.',
  };
}

function withCreatedRepoRecovery(
  error: unknown,
  repoUrl: string,
): AgentCreateRepoError {
  const details = createdRepoAppAccessRecovery(repoUrl);

  if (error instanceof AgentCreateRepoError) {
    return new AgentCreateRepoError(error.message, {
      status: error.status,
      code: error.code,
      installationUrl: error.installationUrl,
      details,
    });
  }

  const message =
    error instanceof Error
      ? error.message
      : 'GitHub App cannot write to the newly created repository';
  return new AgentCreateRepoError(message, {
    status: 403,
    code: 'GITHUB_APP_NOT_INSTALLED',
    details,
  });
}

export async function createAgentTargetRepository(
  targetRepo: IParsedTargetRepo,
  options: {
    auth0UserId?: string;
    isPrivate?: boolean;
  } = {},
  dependencies: IAgentCreateRepoDependencies = {},
): Promise<IAgentCreateRepoResult> {
  const getOwnerType = dependencies.getOwnerType ?? defaultGetOwnerType;
  const repoExists = dependencies.repoExists ?? defaultRepoExists;
  const getStoredUserToken = dependencies.getStoredUserToken ?? getGitHubToken;
  const createRepository =
    dependencies.createRepository ??
    ((params) =>
      createGitHubRepositoryService({
        repoName: params.repoName,
        owner: params.owner,
        isPrivate: params.isPrivate,
        autoInit: params.autoInit,
        auth0UserId: params.auth0UserId,
        method: params.method,
        description: 'Created by Scaffolder agent-scaffold',
      }));
  const verifyAppWriteAccess =
    dependencies.verifyAppWriteAccess ?? defaultVerifyAppWriteAccess;

  const exists = await repoExists(targetRepo.owner, targetRepo.repo);
  if (exists) {
    throw new AgentCreateRepoError(
      `Repository ${targetRepo.owner}/${targetRepo.repo} already exists. Scaffolder will not overwrite it.`,
      {
        status: 409,
        code: 'REPO_EXISTS',
        details: { targetRepo: `${targetRepo.owner}/${targetRepo.repo}` },
      },
    );
  }

  const ownerType = await getOwnerType(targetRepo.owner);
  const auth0UserId = options.auth0UserId;
  const storedToken =
    hasUsableUserIdentity(auth0UserId) && auth0UserId !== undefined
      ? await getStoredUserToken(auth0UserId)
      : null;

  if (ownerType === 'User') {
    if (storedToken === null || storedToken === '') {
      throw new AgentCreateRepoError(
        'Create the user repository first. The GitHub App cannot create personal repositories, and this caller has no stored user-to-server GitHub token.',
        {
          status: 400,
          code: 'USER_REPO_CREATE_UNSUPPORTED',
          details: {
            owner: targetRepo.owner,
            hint: 'Create the empty private repo on GitHub, install the Scaffolder App on it, then call again with create_repo=false.',
          },
        },
      );
    }
  }

  const method: 'personal_token' | 'github_app' | undefined =
    ownerType === 'User'
      ? 'personal_token'
      : ownerType === 'Organization'
        ? 'github_app'
        : undefined;

  try {
    const created = await createRepository({
      owner: targetRepo.owner,
      repoName: targetRepo.repo,
      isPrivate: options.isPrivate ?? true,
      autoInit: true,
      auth0UserId,
      method,
    });
    if (!created.success || created.repoUrl === undefined) {
      throw new AgentCreateRepoError(
        created.message === ''
          ? `Failed to create ${targetRepo.owner}/${targetRepo.repo}`
          : created.message,
        { status: 400, code: 'CREATE_REPO_FAILED' },
      );
    }

    try {
      await verifyAppWriteAccess(targetRepo.owner, targetRepo.repo);
    } catch (error: unknown) {
      throw withCreatedRepoRecovery(error, created.repoUrl);
    }

    return {
      created: true,
      repoUrl: created.repoUrl,
      ownerType,
    };
  } catch (error: unknown) {
    if (error instanceof AgentCreateRepoError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to create repository';
    if (/already exists|name already exists/i.test(message)) {
      throw new AgentCreateRepoError(
        `Repository ${targetRepo.owner}/${targetRepo.repo} already exists. Scaffolder will not overwrite it.`,
        {
          status: 409,
          code: 'REPO_EXISTS',
          details: { targetRepo: `${targetRepo.owner}/${targetRepo.repo}` },
        },
      );
    }
    throw new AgentCreateRepoError(message, {
      status: 400,
      code: 'CREATE_REPO_FAILED',
    });
  }
}
