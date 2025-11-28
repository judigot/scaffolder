import { Hono } from 'hono';
import type {
  IRouteHandler,
  IRouteMiddleware,
  IRouterContext,
} from '@/types/router.ts';
import type { IRouterBuilder } from '../createRouter.ts';

interface IHonoContext {
  req: {
    param: (key: string) => string;
    queries: () => Record<string, string[]>;
    json: () => Promise<unknown>;
    header: (name: string) => string | undefined;
    url: string;
  };
  header: (name: string, value: string) => void;
  status: (code: number) => {
    json: (data: unknown) => Response;
    text: (data: string, status?: number) => Response;
    html: (html: string) => Response;
  };
  json: (data: unknown) => Response;
  text: (data: string, status?: number) => Response;
  html: (html: string) => Response;
  set: (key: string, value: unknown) => void;
  get: (key: string) => unknown;
}

class HonoContextWrapper implements IRouterContext {
  private cachedBody: Promise<unknown> | null = null;
  private cachedParams: Record<string, string> | null = null;
  private cachedQuery: Record<string, string | string[]> | null = null;

  constructor(private c: IHonoContext) {}

  get params(): Record<string, string> {
    this.cachedParams ??= {};
    return this.cachedParams;
  }

  get query(): Record<string, string | string[]> {
    if (this.cachedQuery === null) {
      const queries = this.c.req.queries();
      this.cachedQuery = {};
      const cachedQuery = this.cachedQuery;
      Object.entries(queries).forEach(([key, values]) => {
        if (values.length === 1) {
          cachedQuery[key] = values[0];
        } else {
          cachedQuery[key] = values;
        }
      });
    }
    return this.cachedQuery;
  }

  get body(): () => Promise<unknown> {
    return async () => {
      this.cachedBody ??= this.c.req.json();
      return this.cachedBody;
    };
  }

  get headers(): Record<string, string | string[]> {
    return {};
  }

  getHeader(name: string): string | undefined {
    return this.c.req.header(name);
  }

  setHeader(name: string, value: string): void {
    this.c.header(name, value);
  }

  status(code: number): IRouterContext {
    this.c.status(code);
    return this;
  }

  json(data: unknown, status?: number): Response {
    if (status !== undefined) {
      return this.c.status(status).json(data);
    }
    return this.c.json(data);
  }

  text(data: string, status?: number): Response {
    return this.c.text(data, status);
  }

  html(html: string): Response {
    return this.c.html(html);
  }

  send(data: unknown): Response {
    if (typeof data === 'string') {
      return this.c.text(data);
    }
    return this.c.json(data);
  }

  set(key: string, value: unknown): void {
    this.c.set(key, value);
  }

  get(key: string): unknown {
    return this.c.get(key);
  }
}

function wrapHandler(handler: IRouteHandler, middlewares?: IRouteMiddleware[]) {
  return async (c: IHonoContext) => {
    const context = new HonoContextWrapper(c);

    if (middlewares !== undefined && middlewares.length > 0) {
      let middlewareIndex = 0;
      const runMiddlewares = async (): Promise<Response | null> => {
        if (middlewareIndex >= middlewares.length) {
          return null;
        }
        const middleware = middlewares[middlewareIndex++];
        const next = async (): Promise<unknown> => runMiddlewares();
        const result = await middleware(context, next);
        if (result instanceof Response) {
          return result;
        }
        return runMiddlewares();
      };
      const middlewareResult = await runMiddlewares();
      if (middlewareResult !== null) {
        return middlewareResult;
      }
    }

    const result = await handler(context);
    if (result instanceof Response) {
      return result;
    }
    if (typeof result === 'string') {
      return c.text(result);
    }
    return c.json(result);
  };
}

function isHono(router: unknown): router is Hono {
  return router instanceof Hono;
}

export const honoAdapter: IRouterBuilder = {
  createRouter: () => new Hono(),

  registerRoute: (
    router: unknown,
    method: string,
    path: string,
    handler: IRouteHandler,
    middlewares?: IRouteMiddleware[],
  ) => {
    if (!isHono(router)) {
      return;
    }
    const wrappedHandler = wrapHandler(handler, middlewares);
    if (method === 'get') {
      router.get(path, wrappedHandler);
    } else if (method === 'post') {
      router.post(path, wrappedHandler);
    } else if (method === 'put') {
      router.put(path, wrappedHandler);
    } else if (method === 'delete') {
      router.delete(path, wrappedHandler);
    } else if (method === 'patch') {
      router.patch(path, wrappedHandler);
    }
  },

  registerMiddleware: (
    router: unknown,
    path: string,
    middlewares: IRouteMiddleware[],
  ) => {
    if (!isHono(router)) {
      return;
    }
    const wrappedMiddleware = wrapHandler(
      (_ctx) => new Response(),
      middlewares,
    );
    router.use(path, wrappedMiddleware);
  },

  mountSubRouter: (router: unknown, path: string, subRouter: unknown) => {
    if (!isHono(router) || !isHono(subRouter)) {
      return;
    }
    router.route(path, subRouter);
  },
};
