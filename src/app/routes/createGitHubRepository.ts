import { Hono } from 'hono';
import { createGitHubRepositoryService } from '@/app/services/createGitHubRepositoryService.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

interface ICreateRepositoryBody {
  repoName?: unknown;
  description?: unknown;
  isPrivate?: unknown;
  owner?: unknown;
  method?: unknown;
}

const isCreateRepositoryBody = (val: unknown): val is ICreateRepositoryBody => {
  return typeof val === 'object' && val !== null;
};

router.post('/', async (c) => {
  const verification = await verifyAuth0TokenFromAuthHeader(
    c.req.header('authorization'),
  );

  if (!verification.ok) {
    return c.json(verification.body, verification.status);
  }

  const auth0UserId = verification.auth0UserId;

  if (auth0UserId === '') {
    return c.json({ error: 'User ID not found in token' }, 401);
  }

  const body = await c.req.json<ICreateRepositoryBody>();

  if (!isCreateRepositoryBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const repoName = body.repoName;
  const description = body.description;
  const isPrivate = body.isPrivate;
  const owner = body.owner;
  const method = body.method;

  if (typeof repoName !== 'string' || repoName === '') {
    return c.json(
      {
        error: 'Missing required field',
        message: 'repoName is required',
      },
      400,
    );
  }

  if (typeof owner !== 'string' || owner === '') {
    return c.json(
      {
        error: 'Missing required field',
        message: 'owner is required (GitHub username or organization name)',
      },
      400,
    );
  }

  try {
    const result = await createGitHubRepositoryService({
      repoName,
      description:
        typeof description === 'string' && description !== ''
          ? description
          : undefined,
      isPrivate: typeof isPrivate === 'boolean' ? isPrivate : undefined,
      owner,
      auth0UserId,
      method:
        method === 'personal_token' || method === 'github_app'
          ? method
          : undefined,
    });

    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      const errorResponse: {
        error: string;
        code?: string;
        installationUrl?: string;
      } = {
        error: error.message,
      };

      if ('code' in error && error.code === 'GITHUB_APP_NOT_INSTALLED') {
        errorResponse.code = 'GITHUB_APP_NOT_INSTALLED';
        if (
          'installationUrl' in error &&
          error.installationUrl instanceof Promise
        ) {
          errorResponse.installationUrl = await error.installationUrl;
        } else if (
          'installationUrl' in error &&
          typeof error.installationUrl === 'string'
        ) {
          errorResponse.installationUrl = error.installationUrl;
        }
      }

      return c.json(errorResponse, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
