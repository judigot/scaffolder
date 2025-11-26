import { Router } from 'express';
import { createLocalFilesService } from '../services/createLocalFilesService';
const router = Router();
router.post('/create-local-files', (req, res) => {
  void (async () => {
    try {
      const result = await createLocalFilesService(req.body);
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
