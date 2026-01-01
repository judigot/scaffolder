import { Hono } from 'hono';
import {
  getGitHubToken,
  setGitHubToken,
  deleteGitHubToken,
  getUserMetadata,
  Auth0ManagementApiNotConfiguredError,
  isAuth0ManagementApiConfigured,
} from '@/app/services/auth0Service.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';
import {
  isEncryptionAvailable,
  isEncryptedValue,
} from '@/utils/serverEncryption.ts';

const router = new Hono();

interface ITokenBody {
  token?: unknown;
}

const isTokenBody = (val: unknown): val is ITokenBody => {
  return typeof val === 'object' && val !== null;
};

router.get('/', async (c) => {
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

  try {
    const token = await getGitHubToken(auth0UserId);
    const encryptionAvailable = isEncryptionAvailable();
    const metadata = await getUserMetadata(auth0UserId);
    const rawToken =
      metadata !== null &&
      'github_token' in metadata &&
      typeof metadata.github_token === 'string'
        ? metadata.github_token
        : null;
    const isTokenEncrypted =
      rawToken !== null && rawToken !== '' && isEncryptedValue(rawToken);
    const isConfigured = isAuth0ManagementApiConfigured();
    return c.json({
      success: true,
      token: token ?? null,
      encryptionAvailable,
      isTokenEncrypted: rawToken !== null ? isTokenEncrypted : null,
      serverConfigStatus: {
        auth0ManagementApiConfigured: isConfigured,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      return c.json(
        {
          error: 'Auth0 Management API not configured',
          message: error.message,
          code: 'AUTH0_MANAGEMENT_API_NOT_CONFIGURED',
        },
        500,
      );
    }
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to get GitHub token',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to get GitHub token',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }
});

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

  const body = await c.req.json<ITokenBody>();

  if (!isTokenBody(body)) {
    return c.json(
      {
        error: 'Invalid request body',
        message: 'Request body must be an object',
      },
      400,
    );
  }

  const token = body.token;

  if (typeof token !== 'string' || token === '') {
    return c.json(
      {
        error: 'Missing or invalid token',
        message: 'Token must be a non-empty string',
      },
      400,
    );
  }

  try {
    await setGitHubToken(auth0UserId, token);
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      return c.json(
        {
          error: 'Auth0 Management API not configured',
          message: error.message,
          code: 'AUTH0_MANAGEMENT_API_NOT_CONFIGURED',
        },
        500,
      );
    }
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to save GitHub token',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to save GitHub token',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }

  return c.json({
    success: true,
    message: 'GitHub token stored successfully',
  });
});

router.delete('/', async (c) => {
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

  try {
    await deleteGitHubToken(auth0UserId);
  } catch (error: unknown) {
    if (error instanceof Auth0ManagementApiNotConfiguredError) {
      return c.json(
        {
          error: 'Auth0 Management API not configured',
          message: error.message,
          code: 'AUTH0_MANAGEMENT_API_NOT_CONFIGURED',
        },
        500,
      );
    }
    if (error instanceof Error) {
      return c.json(
        {
          error: 'Failed to delete GitHub token',
          message: error.message,
        },
        500,
      );
    }
    return c.json(
      {
        error: 'Failed to delete GitHub token',
        message: 'An unexpected error occurred',
      },
      500,
    );
  }

  return c.json({
    success: true,
    message: 'GitHub token deleted successfully',
  });
});

export default router;
