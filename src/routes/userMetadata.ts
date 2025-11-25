import { Router, type Request, type Response } from 'express';
import {
  getUserMetadata,
  updateUserMetadata,
} from '@/services/auth0Service.ts';
import { verifyAuth0Token } from '@/utils/verifyAuth0Token.ts';

const router = Router();

router.use(verifyAuth0Token);

router.get('/user-metadata', (req: Request, res: Response) => {
  void (async () => {
    try {
      const auth0UserId =
        'auth0UserId' in req && typeof req.auth0UserId === 'string'
          ? req.auth0UserId
          : undefined;

      if (auth0UserId === undefined || auth0UserId === '') {
        res.status(401).json({ error: 'User ID not found in token' });
        return;
      }

      if (typeof auth0UserId !== 'string') {
        res.status(401).json({ error: 'Invalid user ID type' });
        return;
      }

      const metadata = await getUserMetadata(auth0UserId);

      res.json({
        success: true,
        metadata: metadata ?? null,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  })();
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

router.post('/user-metadata/env', (req: Request, res: Response) => {
  void (async () => {
    try {
      const auth0UserId =
        'auth0UserId' in req && typeof req.auth0UserId === 'string'
          ? req.auth0UserId
          : undefined;

      if (auth0UserId === undefined || auth0UserId === '') {
        res.status(401).json({ error: 'User ID not found in token' });
        return;
      }

      if (typeof auth0UserId !== 'string') {
        res.status(401).json({ error: 'Invalid user ID type' });
        return;
      }

      if (
        !isEnvVariablePayload(req.body) ||
        !Array.isArray(req.body.envVariables)
      ) {
        res.status(400).json({
          error: 'Invalid payload',
          message: 'envVariables must be an array of { key, value } objects.',
        });
        return;
      }

      const envRecord = req.body.envVariables.reduce<Record<string, string>>(
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

      // Ensure metadata object exists and has env key initialized
      const baseMetadata = currentMetadata ?? {};
      let existingEnv: Record<string, unknown> = {};
      if (
        typeof baseMetadata.env === 'object' &&
        baseMetadata.env !== null &&
        !Array.isArray(baseMetadata.env)
      ) {
        const envValue = baseMetadata.env;
        const isRecord = (val: unknown): val is Record<string, unknown> => {
          return typeof val === 'object' && val !== null && !Array.isArray(val);
        };
        if (isRecord(envValue)) {
          existingEnv = envValue;
        }
      }

      const updatedMetadata: Record<string, unknown> = {
        ...baseMetadata,
        env: {
          ...existingEnv,
          ...envRecord,
        },
      };

      await updateUserMetadata(auth0UserId, updatedMetadata);

      res.json({
        success: true,
        env: envRecord,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  })();
});

export default router;
