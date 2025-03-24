import { Router, Request, Response } from 'express';
import { createLocalFilesService } from '@/services/createLocalFilesService.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';

const router = Router();

router.post(
  '/create-local-files',
  (
    req: Request<
      unknown,
      unknown,
      {
        projectName: string;
        publicRepoURL: string;
        backendDir: string;
        schemaInfo: ISchemaInfo[];
        projectFileName: string;
      }
    >,
    res: Response,
  ) => {
    try {
      const result = createLocalFilesService(req.body);
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