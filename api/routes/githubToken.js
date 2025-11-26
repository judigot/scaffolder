import { Router } from 'express';
import {
  getGitHubToken,
  setGitHubToken,
  deleteGitHubToken,
} from '../services/auth0Service';
import { verifyAuth0Token } from '../utils/verifyAuth0Token';
const router = Router();
router.use(verifyAuth0Token);
router.get('/github-token', (req, res) => {
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
      if (typeof auth0UserId !== 'string') {
        res.status(401).json({ error: 'Invalid user ID type' });
        return;
      }
      const token = await getGitHubToken(auth0UserId);
      res.json({
        success: true,
        token: token ?? null,
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  })();
});
router.post('/github-token', (req, res) => {
  void (async () => {
    try {
      const auth0UserId = req.auth0UserId;
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
      const token = req.body.token;
      if (typeof token !== 'string' || token === '') {
        res.status(400).json({
          error: 'Missing or invalid token',
          message: 'Token must be a non-empty string',
        });
        return;
      }
      await setGitHubToken(auth0UserId, token);
      res.json({
        success: true,
        message: 'GitHub token stored successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  })();
});
router.delete('/github-token', (req, res) => {
  void (async () => {
    try {
      const auth0UserId = req.auth0UserId;
      if (auth0UserId === undefined || auth0UserId === '') {
        res.status(401).json({ error: 'User ID not found in token' });
        return;
      }
      await deleteGitHubToken(auth0UserId);
      res.json({
        success: true,
        message: 'GitHub token deleted successfully',
      });
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
