import { Hono } from 'hono';
import { deleteGitHubFileService } from '@/app/services/deleteGitHubFileService.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

interface IDeleteGitHubFileBody {
  publicRepoURL?: unknown;
  filePath?: unknown;
  branch?: unknown;
  commitMessage?: unknown;
}

const isDeleteGitHubFileBody = (val: unknown): val is IDeleteGitHubFileBody => {
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

  const body = await c.req.json<IDeleteGitHubFileBody>();

  if (!isDeleteGitHubFileBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const publicRepoURL = body.publicRepoURL;
  const filePath = body.filePath;
  const branch = body.branch;
  const commitMessage = body.commitMessage;

  if (
    typeof publicRepoURL !== 'string' ||
    publicRepoURL === '' ||
    typeof filePath !== 'string' ||
    filePath === ''
  ) {
    return c.json(
      {
        error: 'Missing required fields',
        message: 'publicRepoURL and filePath are required',
      },
      400,
    );
  }

  try {
    const result = await deleteGitHubFileService({
      publicRepoURL,
      filePath,
      branch: typeof branch === 'string' && branch !== '' ? branch : undefined,
      commitMessage:
        typeof commitMessage === 'string' && commitMessage !== ''
          ? commitMessage
          : undefined,
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
