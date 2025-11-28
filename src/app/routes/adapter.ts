import type { Context } from 'hono';
import type { IRouteContext } from './types.ts';

export function createRouteHandler(
  handler: (c: IRouteContext) => Promise<Response> | Response,
) {
  return (c: Context) => {
    const routeContext: IRouteContext = {
      json: (data: unknown, status?: number) => {
        if (status !== undefined) {
          return c.json(data, status);
        }
        return c.json(data);
      },
      status: (code: number) => ({
        json: (data: unknown, status?: number) => {
          if (status !== undefined) {
            return c.status(code).json(data, status);
          }
          return c.status(code).json(data);
        },
      }),
      req: {
        json: () => c.req.json(),
        header: (name: string) => c.req.header(name),
      },
      get: (key: string) => {
        return c.get(key);
      },
      set: (key: string, value: unknown) => {
        c.set(key, value);
      },
    };
    return handler(routeContext);
  };
}
