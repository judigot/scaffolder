import type { IRouteContext } from './types.ts';
import { scaffoldService } from '@/app/services/scaffoldService.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';

interface IScaffoldRequest {
  schemaInfo: ISchemaInfo[];
  SQLSchema: string | null;
  formData: IFormStore;
}

function isScaffoldRequest(body: unknown): body is IScaffoldRequest {
  return body !== null && typeof body === 'object';
}

export const scaffoldHandler = async (c: IRouteContext) => {
  try {
    const body = await c.req.json();
    if (!isScaffoldRequest(body)) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    const result = await scaffoldService(body);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
};
