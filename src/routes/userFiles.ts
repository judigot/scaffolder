import { Router, Request, Response } from 'express';
import filesToIStructure from '@/utils/filesToIStructure.ts';

const router = Router();

router.get(
  '/userFiles',
  (
    _req: Request<
      unknown,
      unknown,
      {
        path: string;
      }
    >,
    res: Response,
  ) => {
    const result = filesToIStructure('src/files');
    res.json(result);
  },
);

export default router;
