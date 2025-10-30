import { Router, type Request, type Response } from 'express';
import { introspectService } from '@/services/introspectService.ts';
import type { DBTypes } from '@/interfaces/interfaces.ts';

const router = Router();

router.post(
  '/introspect',
  async (
    req: Request<unknown, unknown, { dbConnection: string; dbType: DBTypes }>,
    res: Response,
  ): Promise<void> => {
    try {
      const result = await introspectService({
        dbType: req.body.dbType,
        dbConnection: req.body.dbConnection,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  },
);

export default router;
