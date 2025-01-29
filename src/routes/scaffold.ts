import { Router, Request, Response } from 'express';
import { scaffoldService } from '@/services/scaffoldService.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { IFormStore } from '@/useFormStore.ts';

const router = Router();

router.post(
  '/scaffold',
  (
    req: Request<
      unknown,
      unknown,
      {
        schemaInfo: ISchemaInfo[];
        SQLSchema: string | null;
        formData: IFormStore;
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
