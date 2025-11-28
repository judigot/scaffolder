import type { IRouteContext } from './types.ts';
import { introspectService } from '@/app/services/introspectService.ts';
import type { DBTypes } from '@/interfaces/interfaces.ts';

interface IIntrospectRequest {
  dbConnection: string;
  dbType: DBTypes;
}

function isIntrospectRequest(body: unknown): body is IIntrospectRequest {
  return (
    body !== null &&
    typeof body === 'object' &&
    'dbConnection' in body &&
    'dbType' in body
  );
}

export const introspectHandler = async (c: IRouteContext) => {
  try {
    const body = await c.req.json();
    if (!isIntrospectRequest(body)) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
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
};
