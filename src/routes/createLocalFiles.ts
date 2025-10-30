import { Router, type Request, type Response } from 'express';
import { createLocalFilesService } from '@/services/createLocalFilesService.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';

const router = Router();

router.post(
  '/create-local-files',
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
        const result = await createLocalFilesService(req.body);
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
