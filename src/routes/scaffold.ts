import { Router, Request, Response } from 'express';
import { scaffoldService } from '@/services/scaffoldService.ts';

const router = Router();

router.post(
  '/scaffold',
  (
    req: Request<
      unknown,
      unknown,
      {
        schemaInfo: ISchemaInfo[];
        framework: string;
        backendDir: string;
        frontendDir: string;
        dbConnection: string;
        SQLSchema: string | null;
        backendUrl: string;
      }
    >,
    res: Response,
  ) => {
    void (async () => {
      try {
        const result = await scaffoldService(req.body);
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
