import { Hono } from 'hono';
import { Octokit } from '@octokit/rest';
import {
  getGitHubAppConfig,
  getInstallationUrl,
} from '@/app/services/githubAppService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

interface IExportOption {
  method: 'personal_token' | 'github_app' | 'existing_repo';
  available: boolean;
  recommended: boolean;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  action?: {
    type: 'has_token' | 'needs_token' | 'needs_install' | 'needs_repo_url';
    url?: string;
    message?: string;
  };
}

interface IExportOptionsResponse {
  owner: string;
  ownerType: 'User' | 'Organization' | 'unknown';
  hasPersonalToken: boolean;
  hasGitHubAppInstalled: boolean;
  options: IExportOption[];
}

interface ICheckExportOptionsBody {
  owner?: unknown;
}

const isCheckExportOptionsBody = (
  val: unknown,
): val is ICheckExportOptionsBody => {
  return typeof val === 'object' && val !== null;
};

/**
 * POST /api/check-github-export-options
 * 
 * Returns available export options for a given GitHub owner (user or org).
 * This enables smart, context-aware UI that guides users to the best method.
 */
router.post('/', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const auth0UserId = verification.auth0UserId;

  const body = await c.req.json<ICheckExportOptionsBody>();

  if (!isCheckExportOptionsBody(body)) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const owner = body.owner;
  if (typeof owner !== 'string' || owner === '') {
    return c.json({ error: 'owner is required' }, 400);
  }

  /* Check if user has a personal GitHub token */
  let hasPersonalToken = false;
  if (auth0UserId !== '') {
    const token = await getGitHubToken(auth0UserId);
    hasPersonalToken = token !== null && token !== '';
  }

  /* Check owner type (User vs Organization) */
  let ownerType: 'User' | 'Organization' | 'unknown' = 'unknown';
  try {
    const publicOctokit = new Octokit();
    const { data: ownerData } = await publicOctokit.users.getByUsername({
      username: owner,
    });
    if (ownerData.type === 'User' || ownerData.type === 'Organization') {
      ownerType = ownerData.type;
    }
  } catch {
    /* Could not determine owner type */
  }

  /* Check if GitHub App is installed for this owner */
  let hasGitHubAppInstalled = false;
  let appJWT: string | undefined;
  const appConfig = getGitHubAppConfig();
  if (appConfig !== null) {
    try {
      const { getAppJWT } = await import('@/app/services/githubAppService.ts');
      appJWT = getAppJWT(appConfig.appId, appConfig.privateKey);
      const appOctokit = new Octokit({ auth: appJWT });

      if (ownerType === 'Organization') {
        await appOctokit.apps.getOrgInstallation({ org: owner });
        hasGitHubAppInstalled = true;
      } else {
        await appOctokit.apps.getUserInstallation({ username: owner });
        hasGitHubAppInstalled = true;
      }
    } catch {
      hasGitHubAppInstalled = false;
    }
  }

  /* Build options based on context */
  const options: IExportOption[] = [];

  /* Option 1: Personal Access Token */
  const personalTokenOption: IExportOption = {
    method: 'personal_token',
    available: true,
    recommended: ownerType === 'User',
    label: 'Personal Access Token',
    description: 'Use your GitHub token to create repositories anywhere.',
    pros: [
      'Works for personal accounts AND organizations',
      'Full control over your repositories',
      'One-time setup',
    ],
    cons: [
      'Requires generating a token on GitHub',
      'Token stored in your profile',
    ],
    action: hasPersonalToken
      ? { type: 'has_token', message: 'Ready to export!' }
      : {
          type: 'needs_token',
          url: 'https://github.com/settings/tokens?type=beta',
          message: 'Add your GitHub token in profile settings',
        },
  };
  options.push(personalTokenOption);

  /* Get installation URL if needed - pass appJWT to get the correct URL */
  let installUrl = 'https://github.com/settings/apps';
  if (appConfig !== null && !hasGitHubAppInstalled) {
    installUrl = await getInstallationUrl(owner, appJWT);
  }

  /* Option 2: GitHub App (for organizations) */
  if (ownerType === 'Organization') {
    const githubAppOption: IExportOption = {
      method: 'github_app',
      available: appConfig !== null,
      recommended: true,
      label: 'GitHub App (Recommended for Organizations)',
      description: 'Install our GitHub App to create repos automatically.',
      pros: [
        'No token management needed',
        'Automatic authentication',
        'Best for teams and organizations',
        'Granular permissions',
      ],
      cons: ['Only works for organizations, not personal accounts'],
      action: hasGitHubAppInstalled
        ? { type: 'has_token', message: 'App installed! Ready to export.' }
        : {
            type: 'needs_install',
            url: installUrl,
            message: 'Install the GitHub App on your organization',
          },
    };
    options.push(githubAppOption);
  }

  /* Option 3: GitHub App for existing repos (works for personal accounts too) */
  if (ownerType === 'User' && appConfig !== null) {
    const existingRepoOption: IExportOption = {
      method: 'existing_repo',
      available: true,
      recommended: false,
      label: 'Push to Existing Repository',
      description:
        'Create a repo on GitHub first, then we push files using the GitHub App.',
      pros: [
        'No token needed',
        'Works with personal accounts',
        'GitHub App handles authentication',
      ],
      cons: [
        'Requires creating the repo manually first',
        'Extra step in the workflow',
      ],
      action: hasGitHubAppInstalled
        ? {
            type: 'needs_repo_url',
            message: 'Create a repo on GitHub, then provide the URL',
          }
        : {
            type: 'needs_install',
            url: installUrl,
            message:
              'Install the GitHub App first, then create a repo on GitHub',
          },
    };
    options.push(existingRepoOption);
  }

  const response: IExportOptionsResponse = {
    owner,
    ownerType,
    hasPersonalToken,
    hasGitHubAppInstalled,
    options,
  };

  return c.json(response);
});

export default router;

