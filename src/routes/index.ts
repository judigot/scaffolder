import { Router } from 'express';
import executeCustomSchemaRouter from './executeCustomSchema.ts';
import scaffoldRouter from './scaffold.ts';
import introspectRouter from './introspect.ts';
import userFilesRouter from './getUserFiles.ts';
import getUserFilesFromPublicRepoRouter from './getUserFilesFromPublicRepo.ts';
import createLocalFilesRouter from './createLocalFiles.ts';
import createGitHubFileRouter from './createGitHubFile.ts';
import createGitHubRepositoryRouter from './createGitHubRepository.ts';
import githubTokenRouter from './githubToken.ts';
import helloRouter from './hello.ts';
const router = Router();

router.use(helloRouter);
router.use(executeCustomSchemaRouter);
router.use(scaffoldRouter);
router.use(introspectRouter);
router.use(userFilesRouter);
router.use(getUserFilesFromPublicRepoRouter);
router.use(createLocalFilesRouter);
router.use(createGitHubFileRouter);
router.use(createGitHubRepositoryRouter);
router.use(githubTokenRouter);

export default router;
