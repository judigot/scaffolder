import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/hello', (_req: Request, res: Response) => {
  return res.json({ message: 'Hello, world changed!' });
});

export default router;
