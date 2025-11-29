import { Hono } from 'hono';
import { createGitHubFileService } from '@/app/services/createGitHubFileService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

interface ICreateGitHubFileBody {
  publicRepoURL?: unknown;
  filePath?: unknown;
  content?: unknown;
  branch?: unknown;
  commitMessage?: unknown;
}

const isCreateGitHubFileBody = (val: unknown): val is ICreateGitHubFileBody => {
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

  const body = await c.req.json<ICreateGitHubFileBody>();

  if (!isCreateGitHubFileBody(body)) {
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
  const content = body.content;
  const branch = body.branch;
  const commitMessage = body.commitMessage;

  if (
    typeof publicRepoURL !== 'string' ||
    publicRepoURL === '' ||
    typeof filePath !== 'string' ||
    filePath === '' ||
    typeof content !== 'string' ||
    content === ''
  ) {
    return c.json(
      {
        error: 'Missing required fields',
        message: 'publicRepoURL, filePath, and content are required',
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
          'Please set your GitHub token in the settings before creating files',
      },
      400,
    );
  }

  try {
    const result = await createGitHubFileService({
      publicRepoURL,
      filePath,
      content,
      githubToken,
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
