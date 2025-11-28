import type { IRouteContext } from './types.ts';
import { createLocalFilesService } from '@/app/services/createLocalFilesService.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';

interface ICreateLocalFilesRequest {
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
  formData: IFormStore;
}

function isCreateLocalFilesRequest(
  body: unknown,
): body is ICreateLocalFilesRequest {
  return body !== null && typeof body === 'object';
}

export const createLocalFilesHandler = async (c: IRouteContext) => {
  try {
    const body = await c.req.json();
    if (!isCreateLocalFilesRequest(body)) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    const result = await createLocalFilesService(body);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
};
