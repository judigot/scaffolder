import type { IRouteContext } from './types.ts';
import {
  getGitHubToken,
  setGitHubToken,
  deleteGitHubToken,
} from '@/app/services/auth0Service.ts';

export const getGitHubTokenHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const token = await getGitHubToken(auth0UserId);

    return c.json({
      success: true,
      token: token ?? null,
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};

interface ISetTokenRequest {
  token?: unknown;
}

function isSetTokenRequest(body: unknown): body is ISetTokenRequest {
  return body !== null && typeof body === 'object';
}

export const setGitHubTokenHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const body = await c.req.json();
    if (!isSetTokenRequest(body)) {
      return c.status(400).json({
        error: 'Invalid request body',
        message: 'Request body must be an object',
      });
    }
    const token = body.token;

    if (typeof token !== 'string' || token === '') {
      return c.status(400).json({
        error: 'Missing or invalid token',
        message: 'Token must be a non-empty string',
      });
    }

    await setGitHubToken(auth0UserId, token);

    return c.json({
      success: true,
      message: 'GitHub token stored successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};

export const deleteGitHubTokenHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    await deleteGitHubToken(auth0UserId);

    return c.json({
      success: true,
      message: 'GitHub token deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};
