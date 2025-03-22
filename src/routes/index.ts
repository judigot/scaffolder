import { Router } from 'express';
import executeCustomSchemaRouter from './executeCustomSchema.ts';
import scaffoldRouter from './scaffold.ts';
import introspectRouter from './introspect.ts';
import userFilesRouter from './userFiles.ts';
import getUserFilesFromPublicRepoRouter from './getUserFilesFromPublicRepo.ts';

const router = Router();

router.use(executeCustomSchemaRouter);
router.use(scaffoldRouter);
router.use(introspectRouter);
router.use(userFilesRouter);
router.use(getUserFilesFromPublicRepoRouter);

export default router;
