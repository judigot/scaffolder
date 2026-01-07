import { Hono } from 'hono';
import helloRouter from './hello.ts';
import executeCustomSchemaRouter from './executeCustomSchema.ts';
import scaffoldRouter from './scaffold.ts';
import introspectRouter from './introspect.ts';
import userFilesRouter from './getUserFiles.ts';
import getUserFilesFromPublicRepoRouter from './getUserFilesFromPublicRepo.ts';
import getRepoMetadataRouter from './getRepoMetadata.ts';
import getFileContentRouter from './getFileContent.ts';
import createLocalFilesRouter from './createLocalFiles.ts';
import createGitHubFileRouter from './createGitHubFile.ts';
import deleteGitHubFileRouter from './deleteGitHubFile.ts';
import createGitHubRepositoryRouter from './createGitHubRepository.ts';
import createGitHubFolderStructureRouter from './createGitHubFolderStructure.ts';
import checkGitHubAppInstallationRouter from './checkGitHubAppInstallation.ts';
import githubTokenRouter from './githubToken.ts';
import userMetadataRouter from './userMetadata.ts';
import saveLocalFileRouter from './saveLocalFile.ts';
import deleteLocalFileRouter from './deleteLocalFile.ts';
import healthRouter from './health.ts';
import checkGitHubExportOptionsRouter from './checkGitHubExportOptions.ts';

const router = new Hono();

router.route('/hello', helloRouter);
router.route('/executeCustomSchema', executeCustomSchemaRouter);
router.route('/scaffold', scaffoldRouter);
router.route('/introspect', introspectRouter);
router.route('/getUserFiles', userFilesRouter);
router.route('/getUserFilesFromPublicRepo', getUserFilesFromPublicRepoRouter);
router.route('/get-repo-metadata', getRepoMetadataRouter);
router.route('/get-file-content', getFileContentRouter);
router.route('/create-local-files', createLocalFilesRouter);
router.route('/create-github-file', createGitHubFileRouter);
router.route('/delete-github-file', deleteGitHubFileRouter);
router.route('/create-github-repository', createGitHubRepositoryRouter);
router.route(
  '/create-github-folder-structure',
  createGitHubFolderStructureRouter,
);
router.route('/github-token', githubTokenRouter);
router.route('/user-metadata', userMetadataRouter);
router.route('/save-local-file', saveLocalFileRouter);
router.route('/delete-local-file', deleteLocalFileRouter);
router.route('/health', healthRouter);
router.route('/check-github-app-installation', checkGitHubAppInstallationRouter);
router.route('/check-github-export-options', checkGitHubExportOptionsRouter);

export default router;
