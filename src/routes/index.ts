import { Router } from 'express';
import executeCustomSchemaRouter from './executeCustomSchema.ts';
import scaffoldRouter from './scaffold.ts';
import introspectRouter from './introspect.ts';
import userFilesRouter from './getUserFiles.ts';
import getUserFilesFromPublicRepoRouter from './getUserFilesFromPublicRepo.ts';
import createLocalFilesRouter from './createLocalFiles.ts';

const router = Router();

router.use(executeCustomSchemaRouter);
router.use(scaffoldRouter);
router.use(introspectRouter);
router.use(userFilesRouter);
router.use(getUserFilesFromPublicRepoRouter);
router.use(createLocalFilesRouter);

export default router;
