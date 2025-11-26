import { Router } from 'express';
import convertLocalFilesToIStructure from '../utils/convertLocalFilesToIStructure';
const router = Router();
router.get('/getUserFiles', (_req, res) => {
  const result = convertLocalFilesToIStructure('src/files');
  res.json(result);
});
export default router;
