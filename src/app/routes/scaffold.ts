import { Hono } from 'hono';
import { scaffoldService } from '@/app/services/scaffoldService.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';

const router = new Hono();

interface IScaffoldBody {
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
  formData: IFormStore;
}

router.post('/', async (c) => {
  const body = await c.req.json<IScaffoldBody>();

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
