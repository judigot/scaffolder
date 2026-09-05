import { Hono } from 'hono';
import { executeCustomSchemaService } from '@/app/services/executeCustomSchemaService.ts';
import type { IExecuteCustomSchemaRequest } from '@/interfaces/IExecuteCustomSchemaRequest.ts';

const router = new Hono();

router.post('/', async (c) => {
  const body = await c.req.json<IExecuteCustomSchemaRequest>();

  try {
    const result = await executeCustomSchemaService(body);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
