import { Router } from 'express';
const router = Router();
router.get('/hello', (_req, res) => {
  return res.json({ message: 'Hello, world!' });
});
export default router;
