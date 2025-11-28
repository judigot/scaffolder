export interface IRouterContext {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: () => Promise<unknown>;
  headers: Record<string, string | string[]>;
  getHeader: (name: string) => string | undefined;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => IRouterContext;
  json: (data: unknown, status?: number) => Response;
  text: (data: string, status?: number) => Response;
  html: (html: string) => Response;
  send: (data: unknown) => Response;
  set: (key: string, value: unknown) => void;
  get: (key: string) => unknown;
}

export type IRouteHandler = (
  context: IRouterContext,
) => Promise<Response> | Response;

export interface IRouteDefinition {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handler: IRouteHandler;
  middlewares?: IRouteMiddleware[];
}

export type IRouteMiddleware = (
  context: IRouterContext,
  next: () => Promise<unknown>,
) => Promise<Response> | Response;

export interface IRouter {
  get(
    path: string,
    handler: IRouteHandler,
    ...middlewares: IRouteMiddleware[]
  ): void;
  post(
    path: string,
    handler: IRouteHandler,
    ...middlewares: IRouteMiddleware[]
  ): void;
  put(
    path: string,
    handler: IRouteHandler,
    ...middlewares: IRouteMiddleware[]
  ): void;
  delete(
    path: string,
    handler: IRouteHandler,
    ...middlewares: IRouteMiddleware[]
  ): void;
  patch(
    path: string,
    handler: IRouteHandler,
    ...middlewares: IRouteMiddleware[]
  ): void;
  use(path: string, ...middlewares: IRouteMiddleware[]): void;
  route(path: string, router: IRouter): void;
  getRouter(): unknown;
}
