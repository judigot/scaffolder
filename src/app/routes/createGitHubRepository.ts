import type { IRouteContext } from './types.ts';
import { createGitHubRepositoryService } from '@/app/services/createGitHubRepositoryService.ts';
import { getGitHubToken } from '@/app/services/auth0Service.ts';

interface ICreateRepoRequest {
  repoName?: unknown;
  description?: unknown;
  isPrivate?: unknown;
}

function isCreateRepoRequest(body: unknown): body is ICreateRepoRequest {
  return body !== null && typeof body === 'object';
}

export const createGitHubRepositoryHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const body = await c.req.json();
    if (!isCreateRepoRequest(body)) {
      return c.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be an object',
      });
    }

    const repoName = body.repoName;
    const description = body.description;
    const isPrivate = body.isPrivate;

    if (typeof repoName !== 'string' || repoName === '') {
      return c.status(400).json({
        error: 'Missing required field',
        message: 'repoName is required',
      });
    }

    const githubToken = await getGitHubToken(auth0UserId);

    if (githubToken === null || githubToken === '') {
      return c.status(400).json({
        error: 'GitHub token not found',
        message:
          'Please set your GitHub token in the settings before creating repositories',
      });
    }

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};
