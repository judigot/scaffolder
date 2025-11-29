import { Hono } from 'hono';
import {
  getUserMetadata,
  updateUserMetadata,
} from '@/app/services/auth0Service.ts';
import { verifyAuth0TokenFromAuthHeader } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

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

  const metadata = await getUserMetadata(auth0UserId);

  return c.json({
    success: true,
    metadata: metadata ?? null,
  });
});

interface IEnvVariablePayload {
  envVariables?: { key?: unknown; value?: unknown }[];
}

const isEnvVariablePayload = (val: unknown): val is IEnvVariablePayload => {
  if (typeof val !== 'object' || val === null) {
    return false;
  }
  return 'envVariables' in val;
};

router.post('/env', async (c) => {
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

  const body = await c.req.json<IEnvVariablePayload>();

  if (!isEnvVariablePayload(body) || !Array.isArray(body.envVariables)) {
    return c.json(
      {
        error: 'Invalid payload',
        message: 'envVariables must be an array of { key, value } objects.',
      },
      400,
    );
  }

  const envRecord = body.envVariables.reduce<Record<string, string>>(
    (acc, item) => {
      if (
        typeof item.key === 'string' &&
        item.key.trim() !== '' &&
        typeof item.value === 'string'
      ) {
        acc[item.key.trim()] = item.value;
      }
      return acc;
    },
    {},
  );

  const currentMetadata = await getUserMetadata(auth0UserId);

  const baseMetadata = currentMetadata ?? {};

  const updatedMetadata: Record<string, unknown> = {
    ...baseMetadata,
    env: envRecord,
  };

  await updateUserMetadata(auth0UserId, updatedMetadata);

  return c.json(
    {
      success: true,
      env: envRecord,
    },
    200,
  );
});

export default router;
