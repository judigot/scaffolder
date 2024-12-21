import { Router } from 'express';
import executeCustomSchemaRouter from './executeCustomSchema.ts';
import scaffoldRouter from './scaffold.ts';
import introspectRouter from './introspect.ts';

const router = Router();

router.use(executeCustomSchemaRouter);
router.use(scaffoldRouter);
router.use(introspectRouter);

export default router;
