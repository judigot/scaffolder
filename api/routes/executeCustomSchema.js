import { Router } from 'express';
import { executeCustomSchemaService } from '../services/executeCustomSchemaService';
const router = Router();
router.post('/executeCustomSchema', (req, res) => {
  void (async () => {
    try {
      const result = await executeCustomSchemaService(req.body);
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
