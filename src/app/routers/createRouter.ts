import type { IRouteHandler, IRouteMiddleware } from '@/types/router.ts';

export interface IRoute {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  handler: IRouteHandler;
  middlewares?: IRouteMiddleware[];
}

export interface IRouterBuilder {
  createRouter: () => unknown;
  registerRoute: (
    router: unknown,
    method: string,
    path: string,
    handler: IRouteHandler,
    middlewares?: IRouteMiddleware[],
  ) => void;
  registerMiddleware: (
    router: unknown,
    path: string,
    middlewares: IRouteMiddleware[],
  ) => void;
  mountSubRouter: (router: unknown, path: string, subRouter: unknown) => void;
}

export function buildRouter(
  builder: IRouterBuilder,
  routes: IRoute[],
  middlewares?: { path: string; middlewares: IRouteMiddleware[] }[],
  subRouters?: { path: string; routes: IRoute[] }[],
): unknown {
  const router = builder.createRouter();

  if (middlewares !== undefined) {
    middlewares.forEach(({ path, middlewares: mws }) => {
      builder.registerMiddleware(router, path, mws);
    });
  }

  routes.forEach(({ method, path, handler, middlewares: mws }) => {
    builder.registerRoute(router, method, path, handler, mws);
  });

  if (subRouters !== undefined) {
    subRouters.forEach(({ path, routes: subRoutes }) => {
      const subRouter = buildRouter(builder, subRoutes);
      builder.mountSubRouter(router, path, subRouter);
    });
  }

  return router;
}
