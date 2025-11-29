import { Hono } from 'hono';
import { createGitHubRepositoryService } from '@/app/services/createGitHubRepositoryService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

interface ICreateRepositoryBody {
  repoName?: unknown;
  description?: unknown;
  isPrivate?: unknown;
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

  if (typeof repoName !== 'string' || repoName === '') {
    return c.json(
      {
        error: 'Missing required field',
        message: 'repoName is required',
      },
      400,
    );
  }

  const githubToken = await getGitHubToken(auth0UserId);

  if (githubToken === null || githubToken === '') {
    return c.json(
      {
        error: 'GitHub token not found',
        message:
          'Please set your GitHub token in the settings before creating repositories',
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
      githubToken,
    });

    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
