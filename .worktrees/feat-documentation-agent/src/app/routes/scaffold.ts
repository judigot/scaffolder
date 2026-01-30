import { Hono } from 'hono';
import { scaffoldService } from '@/app/services/scaffoldService.ts';
import type { IProjectGenerationRequest } from '@/interfaces/IProjectGenerationRequest.ts';

const router = new Hono();

router.post('/', async (c) => {
  const body = await c.req.json<IProjectGenerationRequest>();

  try {
    const result = await scaffoldService(body);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
