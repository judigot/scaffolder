export interface IRouteContext {
  json: (data: unknown, status?: number) => Response;
  status: (code: number) => {
    json: (data: unknown, status?: number) => Response;
  };
  req: {
    json: () => Promise<unknown>;
    header: (name: string) => string | undefined;
  };
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
}
