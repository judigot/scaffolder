import { Hono } from 'hono';
import { getGitHubAppConfig } from '@/app/services/githubAppService.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

interface ICheckInstallationBody {
  owner?: unknown;
}

const isCheckInstallationBody = (
  val: unknown,
): val is ICheckInstallationBody => {
  return typeof val === 'object' && val !== null;
};

router.post('/', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const body = await c.req.json<ICheckInstallationBody>();

  if (!isCheckInstallationBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const owner = body.owner;

  if (typeof owner !== 'string' || owner === '') {
    return c.json(
      {
        error: 'Missing required field',
        message: 'owner is required (GitHub username or organization name)',
      },
      400,
    );
  }

  const appConfig = getGitHubAppConfig();
  if (appConfig === null) {
    return c.json(
      {
        error: 'GitHub App is not configured',
        message:
          'GitHub App is not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY environment variables.',
      },
      500,
    );
  }

  try {
    const { getAppJWT } = await import('@/app/services/githubAppService.ts');
    const appJWT = getAppJWT(appConfig.appId, appConfig.privateKey);

    /* Use GitHub API to check if app is installed for the owner */
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({
      auth: appJWT,
    });

    try {
      /* Try to get installation for user */
      const userInstallation = await octokit.apps.getUserInstallation({
        username: owner,
      });

      if (userInstallation.data.id !== undefined) {
        return c.json({
          installed: true,
          message: 'GitHub App is installed',
          installationId: userInstallation.data.id,
          repositorySelection: userInstallation.data.repository_selection,
          permissions: userInstallation.data.permissions,
        });
      }
    } catch (userError: unknown) {
      /* If user installation fails, try organization */
      try {
        const orgInstallation = await octokit.apps.getOrgInstallation({
          org: owner,
        });

        if (orgInstallation.data.id !== undefined) {
          return c.json({
            installed: true,
            message: 'GitHub App is installed',
            installationId: orgInstallation.data.id,
            repositorySelection: orgInstallation.data.repository_selection,
            permissions: orgInstallation.data.permissions,
          });
        }
      } catch (orgError: unknown) {
        /* Both failed, app is not installed */
        if (
          (userError instanceof Error &&
            'status' in userError &&
            typeof userError.status === 'number' &&
            userError.status === 404) ||
          (orgError instanceof Error &&
            'status' in orgError &&
            typeof orgError.status === 'number' &&
            orgError.status === 404)
        ) {
          return c.json({
            installed: false,
            message: 'GitHub App is not installed',
          });
        }
        /* Some other error occurred */
        throw userError instanceof Error ? userError : orgError;
      }
    }

    /* Fallback: not installed */
    return c.json({
      installed: false,
      message: 'GitHub App is not installed',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to check installation status',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to check installation status',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

export default router;

