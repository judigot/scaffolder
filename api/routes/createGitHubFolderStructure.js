import { Router } from 'express';
import { createGitHubFolderStructure } from '../utils/createGitHubFolderStructure';
import { getGitHubToken } from '../services/auth0Service';
import { verifyAuth0Token } from '../utils/verifyAuth0Token';
const router = Router();
router.use(verifyAuth0Token);
router.post('/create-github-folder-structure', (req, res) => {
  void (async () => {
    try {
      const auth0UserId =
        'auth0UserId' in req && typeof req.auth0UserId === 'string'
          ? req.auth0UserId
          : undefined;
      if (auth0UserId === undefined || auth0UserId === '') {
        res.status(401).json({ error: 'User ID not found in token' });
        return;
      }
      const isRequestBody = (val) => {
        return typeof val === 'object' && val !== null;
      };
      if (!isRequestBody(req.body)) {
        res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be an object',
        });
        return;
      }
      const structure = req.body.structure;
      const owner = req.body.owner;
      const repo = req.body.repo;
      const basePath = req.body.basePath;
      const branch = req.body.branch;
      const commitMessage = req.body.commitMessage;
      const projectName = req.body.projectName;
      if (!Array.isArray(structure)) {
        res.status(400).json({
          error: 'Missing required field',
          message: 'structure is required and must be an array',
        });
        return;
      }
      if (typeof owner !== 'string' || owner === '') {
        res.status(400).json({
          error: 'Missing required field',
          message: 'owner is required',
        });
        return;
      }
      if (typeof repo !== 'string' || repo === '') {
        res.status(400).json({
          error: 'Missing required field',
          message: 'repo is required',
        });
        return;
      }
      const githubToken = await getGitHubToken(auth0UserId);
      if (githubToken === null || githubToken === '') {
        res.status(400).json({
          error: 'GitHub token not found',
          message:
            'Please set your GitHub token in the settings before uploading files',
        });
        return;
      }
      const isValidStructureItem = (item) => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }
        if (!('type' in item) || !('name' in item)) {
          return false;
        }
        const itemWithProps = item;
        const typeProp =
          'type' in itemWithProps ? itemWithProps.type : undefined;
        if (typeof typeProp !== 'string') {
          return false;
        }
        return typeProp === 'file' || typeProp === 'folder';
      };
      const isValidStructure = (val) => {
        if (!Array.isArray(val)) {
          return false;
        }
        return val.every(isValidStructureItem);
      };
      if (!isValidStructure(structure)) {
        res.status(400).json({
          error: 'Invalid structure format',
          message: 'structure must be a valid IStructure array',
        });
        return;
      }
      const result = await createGitHubFolderStructure({
        structure,
        owner,
        repo,
        githubToken,
        basePath:
          typeof basePath === 'string' && basePath !== ''
            ? basePath
            : undefined,
        branch:
          typeof branch === 'string' && branch !== '' ? branch : undefined,
        commitMessage:
          typeof commitMessage === 'string' && commitMessage !== ''
            ? commitMessage
            : undefined,
        projectName:
          typeof projectName === 'string' && projectName !== ''
            ? projectName
            : undefined,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  })();
});
export default router;
