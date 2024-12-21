import { Router, Request, Response } from 'express';
import { introspectService } from '@/services/introspectService.ts';

const router = Router();

router.post(
  '/introspect',
  async (
    req: Request<unknown, unknown, { dbConnection: string }>,
    res: Response,
  ): Promise<void> => {
    try {
      const result = await introspectService(req.body);
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
