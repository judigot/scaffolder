import { Router } from 'express';
import { scaffoldService } from '../services/scaffoldService';
const router = Router();
router.post('/scaffold', (req, res) => {
  void (async () => {
    try {
      const result = await scaffoldService(req.body);
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
