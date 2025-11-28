type HonoMiddleware = (
  c: unknown,
  next: () => Promise<undefined>,
) => Promise<Response | undefined> | Response | undefined;

declare module 'hono' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export interface Context {
    json: (data: unknown, status?: number) => Response;
    status: (code: number) => {
      json: (data: unknown, status?: number) => Response;
      text: (data: string, status?: number) => Response;
      html: (html: string) => Response;
    };
    req: {
      json: () => Promise<unknown>;
      header: (name: string) => string | undefined;
    };
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
  }

  export type Next = () => Promise<Response>;

  export class Hono {
    constructor();
    get(path: string, ...handlers: unknown[]): this;
    post(path: string, ...handlers: unknown[]): this;
    put(path: string, ...handlers: unknown[]): this;
    delete(path: string, ...handlers: unknown[]): this;
    patch(path: string, ...handlers: unknown[]): this;
    use(middleware: HonoMiddleware): this;
    use(path: string, ...handlers: unknown[]): this;
    route(path: string, router: Hono): this;
    fetch(request: Request): Promise<Response>;
  }
}

declare module 'hono/compress' {
  export function compress(): HonoMiddleware;
}

declare module 'hono/cors' {
  export function cors(): HonoMiddleware;
}

declare module '@hono/node-server' {
  export function serve(
    options: { fetch: (request: Request) => Promise<Response>; port: number },
    callback?: (info: { port: number }) => void,
  ): void;
}

declare module '@hono/node-server/serve-static' {
  export function serveStatic(options: { root: string }): unknown;
}
