import { Hono } from 'hono';
import { createLocalFilesService } from '@/app/services/createLocalFilesService.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';

const router = new Hono();

interface ICreateLocalFilesBody {
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
  formData: IFormStore;
}

router.post('/', async (c) => {
  const body = await c.req.json<ICreateLocalFilesBody>();

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
