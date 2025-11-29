import { Hono } from 'hono';
import convertLocalFilesToIStructure from '@/utils/convertLocalFilesToIStructure.ts';

const router = new Hono();

router.get('/', (c) => {
  const result = convertLocalFilesToIStructure('src/files');
  return c.json(result);
});

export default router;
