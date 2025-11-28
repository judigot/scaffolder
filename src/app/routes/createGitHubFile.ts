import type { IRouteContext } from './types.ts';
import { createGitHubFileService } from '@/app/services/createGitHubFileService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';

interface ICreateFileRequest {
  publicRepoURL?: unknown;
  filePath?: unknown;
  content?: unknown;
  branch?: unknown;
  commitMessage?: unknown;
}

function isCreateFileRequest(body: unknown): body is ICreateFileRequest {
  return body !== null && typeof body === 'object';
}

export const createGitHubFileHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const body = await c.req.json();
    if (!isCreateFileRequest(body)) {
      return c.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be an object',
      });
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
      return c.status(400).json({
        error: 'Missing required fields',
        message: 'publicRepoURL, filePath, and content are required',
      });
    }

    const githubToken = await getGitHubToken(auth0UserId);

    if (githubToken === null || githubToken === '') {
      return c.status(400).json({
        error: 'GitHub token not found',
        message:
          'Please set your GitHub token in the settings before creating files',
      });
    }

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};
