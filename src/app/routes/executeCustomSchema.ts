import type { IRouteContext } from './types.ts';
import { executeCustomSchemaService } from '@/app/services/executeCustomSchemaService.ts';
import type { IExecuteCustomSchemaRequest } from '@/interfaces/IExecuteCustomSchemaRequest.ts';

function isExecuteCustomSchemaRequest(
  body: unknown,
): body is IExecuteCustomSchemaRequest {
  return body !== null && typeof body === 'object';
}

export const executeCustomSchemaHandler = async (c: IRouteContext) => {
  try {
    const body = await c.req.json();
    if (!isExecuteCustomSchemaRequest(body)) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
    const result = await executeCustomSchemaService(body);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
};
