import { Router } from 'express';
import { createGitHubRepositoryService } from '../services/createGitHubRepositoryService';
import { getGitHubToken } from '../services/auth0Service';
import { verifyAuth0Token } from '../utils/verifyAuth0Token';
const router = Router();
router.use(verifyAuth0Token);
router.post('/create-github-repository', (req, res) => {
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
      const repoName = req.body.repoName;
      const description = req.body.description;
      const isPrivate = req.body.isPrivate;
      if (typeof repoName !== 'string' || repoName === '') {
        res.status(400).json({
          error: 'Missing required field',
          message: 'repoName is required',
        });
        return;
      }
      const githubToken = await getGitHubToken(auth0UserId);
      if (githubToken === null || githubToken === '') {
        res.status(400).json({
          error: 'GitHub token not found',
          message:
            'Please set your GitHub token in the settings before creating repositories',
        });
        return;
      }
      const result = await createGitHubRepositoryService({
        repoName,
        description:
          typeof description === 'string' && description !== ''
            ? description
            : undefined,
        isPrivate: typeof isPrivate === 'boolean' ? isPrivate : undefined,
        githubToken,
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
