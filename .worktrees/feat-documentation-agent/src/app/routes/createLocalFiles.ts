import { Hono } from 'hono';
import { createLocalFilesService } from '@/app/services/createLocalFilesService.ts';
import type { IProjectGenerationRequest } from '@/interfaces/IProjectGenerationRequest.ts';

const router = new Hono();

router.post('/', async (c) => {
  const body = await c.req.json<IProjectGenerationRequest>();

  try {
    const result = await createLocalFilesService(body);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
