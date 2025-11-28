import type { IRouteContext } from './types.ts';
import {
  getUserMetadata,
  updateUserMetadata,
} from '@/app/services/auth0Service.ts';

export const getUserMetadataHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const metadata = await getUserMetadata(auth0UserId);

    return c.json({
      success: true,
      metadata: metadata ?? null,
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.status(400).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};

interface IEnvVariablePayload {
  envVariables?: { key?: unknown; value?: unknown }[];
}

function isEnvVariablePayload(val: unknown): val is IEnvVariablePayload {
  if (typeof val !== 'object' || val === null) {
    return false;
  }
  return 'envVariables' in val;
}

export const setUserEnvMetadataHandler = async (c: IRouteContext) => {
  try {
    const auth0UserId = c.get('auth0UserId');

    if (auth0UserId === undefined || auth0UserId === '') {
      return c.status(401).json({ error: 'User ID not found in token' });
    }

    if (typeof auth0UserId !== 'string') {
      return c.status(401).json({ error: 'Invalid user ID type' });
    }

    const body = await c.req.json();

    if (!isEnvVariablePayload(body) || !Array.isArray(body.envVariables)) {
      return c.status(400).json({
        error: 'Invalid payload',
        message: 'envVariables must be an array of { key, value } objects.',
      });
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

    return c.json({
      success: true,
      env: envRecord,
    });
  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message.includes('Failed to') ? 500 : 400;
      return c.status(statusCode).json({ error: error.message });
    }
    return c.status(500).json({ error: 'An unexpected error occurred' });
  }
};
