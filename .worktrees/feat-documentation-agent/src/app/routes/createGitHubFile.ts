import { Hono } from 'hono';
import { createGitHubFileService } from '@/app/services/createGitHubFileService.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';
import { USE_USER_ENV_REGEX } from '@/utils/project-builder/constants/templateActions.ts';

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

  // Security check: Detect USE_USER_ENV usage before committing to GitHub
  // This prevents secrets from being committed to repositories
  if (USE_USER_ENV_REGEX.test(content)) {
    return c.json(
      {
        error: 'USE_USER_ENV detected',
        message:
          `Cannot commit to GitHub: USE_USER_ENV detected in file content. This would expose your secrets.\n\n` +
          `File: ${filePath}\n\n` +
          `Options:\n` +
          `1. Remove USE_USER_ENV from templates and use placeholders (e.g., \${KEY_NAME} or process.env.KEY_NAME)\n` +
          `2. Download files locally instead (USE_USER_ENV works for local files)\n` +
          `3. Use environment variable references in code (process.env.KEY_NAME)`,
      },
      400,
    );
  }

  try {
    const result = await createGitHubFileService({
      publicRepoURL,
      filePath,
      content,
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
