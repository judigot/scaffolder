import { Router } from 'express';
import { introspectService } from '../services/introspectService';
const router = Router();
router.post('/introspect', async (req, res) => {
  try {
    const result = await introspectService({
      dbType: req.body.dbType,
      dbConnection: req.body.dbConnection,
    });
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});
export default router;
