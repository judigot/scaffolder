import { Hono } from 'hono';
import {
  getGitHubToken,
  setGitHubToken,
  deleteGitHubToken,
} from '@/app/services/auth0Service.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

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

  const token = await getGitHubToken(auth0UserId);

  return c.json({
    success: true,
    token: token ?? null,
  });
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

  await setGitHubToken(auth0UserId, token);

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

  await deleteGitHubToken(auth0UserId);

  return c.json({
    success: true,
    message: 'GitHub token deleted successfully',
  });
});

export default router;
