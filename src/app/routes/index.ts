import { Hono } from 'hono';
import { createRouteHandler } from './adapter.ts';
import { helloHandler } from './hello.ts';
import { scaffoldHandler } from './scaffold.ts';
import { executeCustomSchemaHandler } from './executeCustomSchema.ts';
import { introspectHandler } from './introspect.ts';
import { getUserFilesHandler } from './getUserFiles.ts';
import { getUserFilesFromPublicRepoHandler } from './getUserFilesFromPublicRepo.ts';
import { createLocalFilesHandler } from './createLocalFiles.ts';
import { createGitHubFileHandler } from './createGitHubFile.ts';
import { createGitHubRepositoryHandler } from './createGitHubRepository.ts';
import { createGitHubFolderStructureHandler } from './createGitHubFolderStructure.ts';
import {
  getGitHubTokenHandler,
  setGitHubTokenHandler,
  deleteGitHubTokenHandler,
} from './githubToken.ts';
import {
  getUserMetadataHandler,
  setUserEnvMetadataHandler,
} from './userMetadata.ts';
import { verifyAuth0Token } from '@/utils/verifyAuth0Token.ts';

const router = new Hono();

// Public routes
router.get('/hello', createRouteHandler(helloHandler));
router.post('/scaffold', createRouteHandler(scaffoldHandler));
router.post(
  '/executeCustomSchema',
  createRouteHandler(executeCustomSchemaHandler),
);
router.post('/introspect', createRouteHandler(introspectHandler));
router.get('/getUserFiles', createRouteHandler(getUserFilesHandler));
router.post(
  '/getUserFilesFromPublicRepo',
  createRouteHandler(getUserFilesFromPublicRepoHandler),
);
router.post('/create-local-files', createRouteHandler(createLocalFilesHandler));

// Protected routes - all require authentication
const protectedRoutes = new Hono();
protectedRoutes.use('/*', verifyAuth0Token);
protectedRoutes.get('/github-token', createRouteHandler(getGitHubTokenHandler));
protectedRoutes.post(
  '/github-token',
  createRouteHandler(setGitHubTokenHandler),
);
protectedRoutes.delete(
  '/github-token',
  createRouteHandler(deleteGitHubTokenHandler),
);
protectedRoutes.post(
  '/create-github-repository',
  createRouteHandler(createGitHubRepositoryHandler),
);
protectedRoutes.post(
  '/create-github-file',
  createRouteHandler(createGitHubFileHandler),
);
protectedRoutes.post(
  '/create-github-folder-structure',
  createRouteHandler(createGitHubFolderStructureHandler),
);
protectedRoutes.get(
  '/user-metadata',
  createRouteHandler(getUserMetadataHandler),
);
protectedRoutes.post(
  '/user-metadata/env',
  createRouteHandler(setUserEnvMetadataHandler),
);

router.route('/', protectedRoutes);

export default router;
