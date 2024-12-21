import { Router, Request, Response } from 'express';
import { executeCustomSchemaService } from '@/services/executeCustomSchemaService.ts';
import { IExecuteCustomSchemaRequest } from '@/interfaces/IExecuteCustomSchemaRequest.ts';

const router = Router();

router.post(
  '/executeCustomSchema',
  (
    req: Request<unknown, unknown, IExecuteCustomSchemaRequest>,
    res: Response,
  ) => {
    void (async () => {
      try {
        const result = await executeCustomSchemaService(req.body);
        res.json(result);
      } catch (error) {
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'An unexpected error occurred' });
        }
      }
    })();
  },
);

export default router;
