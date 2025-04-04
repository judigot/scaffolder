import { Router, Request, Response } from 'express';
import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';

const router = Router();

router.get(
  '/getUserFiles',
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
    const result = convertLocalFilesToIStructure('src/files');
    res.json(result);
  },
);

export default router;