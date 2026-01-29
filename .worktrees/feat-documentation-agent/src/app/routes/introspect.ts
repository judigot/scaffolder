import { Hono } from 'hono';
import { introspectService } from '@/app/services/introspectService.ts';
import type { DBTypes } from '@/interfaces/interfaces.ts';

const router = new Hono();

interface IIntrospectBody {
  dbConnection: string;
  dbType: DBTypes;
}

router.post('/', async (c) => {
  const body = await c.req.json<IIntrospectBody>();

  try {
    const result = await introspectService({
      dbType: body.dbType,
      dbConnection: body.dbConnection,
    });
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

export default router;
