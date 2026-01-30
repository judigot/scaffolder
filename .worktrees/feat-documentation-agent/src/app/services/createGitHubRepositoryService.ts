import { Octokit } from '@octokit/rest';
import {
  clearInstallationTokenCache,
  getGitHubAppConfig,
  getGitHubAppOctokit,
  getInstallationUrl,
} from './githubAppService.ts';
import { getGitHubToken } from './auth0Service.ts';

interface ICreateGitHubRepositoryRequest {
  repoName: string;
  description?: string;
  isPrivate?: boolean;
  owner?: string;
  auth0UserId?: string;
  /** Force a specific method: 'personal_token' | 'github_app' */
  method?: 'personal_token' | 'github_app';
}

/**
 * Smart hybrid repository creation service.
 * 
 * Automatically selects the best method based on context:
 * - Organizations: Uses GitHub App if installed, otherwise personal token
 * - Personal accounts: Uses personal token (GitHub App can't create repos for users)
 * 
 * Can also be forced to use a specific method via the `method` parameter.
 */
export const createGitHubRepositoryService = async (
  data: ICreateGitHubRepositoryRequest,
): Promise<{ success: boolean; message: string; repoUrl?: string }> => {
  const {
    repoName,
    description = '',
    isPrivate = false,
    owner,
    auth0UserId,
    method,
  } = data;

  if (!repoName || repoName === '') {
    throw new Error('Repository name is required');
  }

  if (owner === undefined || owner === '') {
    throw new Error('Owner is required to create a repository');
  }

  /* If method is explicitly specified, use it */
  if (method === 'personal_token') {
    return createWithPersonalToken(repoName, description, isPrivate, owner, auth0UserId);
  }

  if (method === 'github_app') {
    return createWithGitHubApp(repoName, description, isPrivate, owner, auth0UserId);
  }

  /* Auto-detect: Check if owner is User or Organization */
  const ownerType = await getOwnerType(owner);

  if (ownerType === 'Organization') {
    /* For organizations: Try GitHub App first, fall back to personal token */
    const appConfig = getGitHubAppConfig();
    if (appConfig !== null) {
      const isAppInstalled = await checkGitHubAppInstalled(owner, 'Organization');
      if (isAppInstalled) {
        try {
          return await createWithGitHubApp(repoName, description, isPrivate, owner, auth0UserId);
        } catch (appError) {
          /* If GitHub App fails, try personal token as fallback */
          if (auth0UserId !== undefined && auth0UserId !== '') {
            const hasToken = await getGitHubToken(auth0UserId);
            if (hasToken !== null && hasToken !== '') {
              return createWithPersonalToken(repoName, description, isPrivate, owner, auth0UserId);
            }
          }
          throw appError;
        }
      }
    }
    /* GitHub App not available/installed, try personal token */
    return createWithPersonalToken(repoName, description, isPrivate, owner, auth0UserId);
  }

  /* For personal accounts: Must use personal token */
  return createWithPersonalToken(repoName, description, isPrivate, owner, auth0UserId);
};

/**
 * Get owner type (User or Organization)
 */
async function getOwnerType(owner: string): Promise<'User' | 'Organization' | 'unknown'> {
  try {
    const publicOctokit = new Octokit();
    const { data } = await publicOctokit.users.getByUsername({ username: owner });
    if (data.type === 'User' || data.type === 'Organization') {
      return data.type;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Check if GitHub App is installed for an owner
 */
async function checkGitHubAppInstalled(
  owner: string,
  ownerType: 'User' | 'Organization' | 'unknown',
): Promise<boolean> {
  const appConfig = getGitHubAppConfig();
  if (appConfig === null) {
    return false;
  }

  try {
    const { getAppJWT } = await import('./githubAppService.ts');
    const appJWT = getAppJWT(appConfig.appId, appConfig.privateKey);
    const appOctokit = new Octokit({ auth: appJWT });

    if (ownerType === 'Organization') {
      await appOctokit.apps.getOrgInstallation({ org: owner });
      return true;
    } else {
      await appOctokit.apps.getUserInstallation({ username: owner });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Create repository using user's personal access token
 */
async function createWithPersonalToken(
  repoName: string,
  description: string,
  isPrivate: boolean,
  owner: string,
  auth0UserId?: string,
): Promise<{ success: boolean; message: string; repoUrl?: string }> {
  if (auth0UserId === undefined || auth0UserId === '') {
    throw new Error(
      'Authentication required. Please log in to create a repository.',
    );
  }

  const userGitHubToken = await getGitHubToken(auth0UserId);
  if (userGitHubToken === null || userGitHubToken === '') {
    const ownerType = await getOwnerType(owner);
    
    if (ownerType === 'User') {
      throw new Error(
        'GitHub token required for personal accounts.\n\n' +
          'To create repositories in your personal account, you need to add a GitHub Personal Access Token.\n\n' +
          '1. Go to: https://github.com/settings/tokens?type=beta\n' +
          '2. Generate a new fine-grained token with "Administration" permission\n' +
          '3. Add the token in your profile settings',
      );
    } else {
      throw new Error(
        'GitHub token not found.\n\n' +
          'Please add your personal access token in your profile settings, or install the GitHub App for your organization.',
      );
    }
  }

  const octokit = new Octokit({ auth: userGitHubToken });

  try {
    /* Check if owner matches authenticated user */
    const { data: authUser } = await octokit.users.getAuthenticated();

    let response;
    if (authUser.login.toLowerCase() === owner.toLowerCase()) {
      /* Creating repo for authenticated user */
      response = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: description || undefined,
        private: isPrivate,
        auto_init: false,
      });
    } else {
      /* Creating repo in an organization */
      response = await octokit.repos.createInOrg({
        org: owner,
        name: repoName,
        description: description || undefined,
        private: isPrivate,
        auto_init: false,
      });
    }

    return {
      success: true,
      message: 'Repository created successfully',
      repoUrl: response.data.html_url,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
    throw new Error('Failed to create repository: Unknown error');
  }
}

/**
 * Create repository using GitHub App installation token
 * Note: Only works for organizations, not personal accounts
 */
async function createWithGitHubApp(
  repoName: string,
  description: string,
  isPrivate: boolean,
  owner: string,
  auth0UserId?: string,
): Promise<{ success: boolean; message: string; repoUrl?: string }> {
  const appConfig = getGitHubAppConfig();
  if (appConfig === null) {
    throw new Error(
      'GitHub App is not configured. Please use a personal access token instead.',
    );
  }

  /* Check owner type */
  const ownerType = await getOwnerType(owner);

  /* Personal accounts: GitHub App cannot create repos */
  if (ownerType === 'User') {
    /* Fall back to personal token if available */
    if (auth0UserId !== undefined && auth0UserId !== '') {
      const userGitHubToken = await getGitHubToken(auth0UserId);
      if (userGitHubToken !== null && userGitHubToken !== '') {
        return createWithPersonalToken(repoName, description, isPrivate, owner, auth0UserId);
      }
    }

    const installUrl = await getInstallationUrl(owner);
    throw new Error(
      'GitHub App cannot create repositories for personal accounts.\n\n' +
        'For personal accounts, you have two options:\n\n' +
        '1. Add a Personal Access Token (recommended)\n' +
        '   → Go to your profile settings and add your GitHub token\n\n' +
        '2. Create the repository manually first\n' +
        '   → Create an empty repo on GitHub, then use "Push to Existing Repo"\n' +
        `   → Install the app: ${installUrl}`,
    );
  }

  /* Organizations: Use GitHub App */
  const isInstalled = await checkGitHubAppInstalled(owner, ownerType);
  if (!isInstalled) {
    const installUrl = await getInstallationUrl(owner);
    const error: Error & { code?: string; installationUrl?: string } = new Error(
      `GitHub App is not installed for organization "${owner}".\n\n` +
        `Please install the app first: ${installUrl}`,
    );
    error.code = 'GITHUB_APP_NOT_INSTALLED';
    error.installationUrl = installUrl;
    throw error;
  }

  const octokit = await getGitHubAppOctokit(appConfig, { owner });

  try {
    const response = await octokit.repos.createInOrg({
      org: owner,
      name: repoName,
      description: description || undefined,
      private: isPrivate,
      auto_init: false,
    });

    return {
      success: true,
      message: 'Repository created successfully (via GitHub App)',
      repoUrl: response.data.html_url,
    };
  } catch (error: unknown) {
    /* If 403, try clearing cache and retrying */
    if (
      error instanceof Error &&
      'status' in error &&
      error.status === 403
    ) {
      /* Get installation ID for cache clearing */
      try {
        const { getAppJWT } = await import('./githubAppService.ts');
        const appJWT = getAppJWT(appConfig.appId, appConfig.privateKey);
        const appOctokit = new Octokit({ auth: appJWT });
        const { data: installation } = await appOctokit.apps.getOrgInstallation({
          org: owner,
        });
        clearInstallationTokenCache(installation.id);

        const freshOctokit = await getGitHubAppOctokit(appConfig, { owner });
        const response = await freshOctokit.repos.createInOrg({
          org: owner,
          name: repoName,
          description: description || undefined,
          private: isPrivate,
          auto_init: false,
        });

        return {
          success: true,
          message: 'Repository created successfully (via GitHub App)',
          repoUrl: response.data.html_url,
        };
      } catch (retryError: unknown) {
        if (retryError instanceof Error) {
          throw new Error(`Failed to create repository: ${retryError.message}`);
        }
      }
    }

    if (error instanceof Error) {
      throw new Error(`Failed to create repository: ${error.message}`);
    }
    throw new Error('Failed to create repository: Unknown error');
  }
}
