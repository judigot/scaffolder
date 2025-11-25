import { Router, type Request, type Response } from 'express';
import { getUserMetadata } from '@/services/auth0Service.ts';
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

export default router;
