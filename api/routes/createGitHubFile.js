import { Router } from 'express';
import { createGitHubFileService } from '../services/createGitHubFileService';
import { getGitHubToken } from '../services/auth0Service';
import { verifyAuth0Token } from '../utils/verifyAuth0Token';
const router = Router();
router.use(verifyAuth0Token);
router.post('/create-github-file', (req, res) => {
  void (async () => {
    try {
      // Type guard for auth0UserId
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
      const publicRepoURL = req.body.publicRepoURL;
      const filePath = req.body.filePath;
      const content = req.body.content;
      const branch = req.body.branch;
      const commitMessage = req.body.commitMessage;
      if (
        typeof publicRepoURL !== 'string' ||
        publicRepoURL === '' ||
        typeof filePath !== 'string' ||
        filePath === '' ||
        typeof content !== 'string' ||
        content === ''
      ) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'publicRepoURL, filePath, and content are required',
        });
        return;
      }
      if (typeof auth0UserId !== 'string' || auth0UserId === '') {
        res.status(401).json({ error: 'User ID not found in token' });
        return;
      }
      const githubToken = await getGitHubToken(auth0UserId);
      if (githubToken === null || githubToken === '') {
        res.status(400).json({
          error: 'GitHub token not found',
          message:
            'Please set your GitHub token in the settings before creating files',
        });
        return;
      }
      const result = await createGitHubFileService({
        publicRepoURL,
        filePath,
        content,
        githubToken,
        branch:
          typeof branch === 'string' && branch !== '' ? branch : undefined,
        commitMessage:
          typeof commitMessage === 'string' && commitMessage !== ''
            ? commitMessage
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
