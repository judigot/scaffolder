type ITestMockFunction = (...args: unknown[]) => unknown;
interface ITestMockApi {
  mock: (id: string, factory: () => unknown) => void;
  fn: (impl?: ITestMockFunction) => ITestMockFunction;
  clearAllMocks: () => void;
}

declare global {
  var vi: ITestMockApi | undefined;
}

declare module 'bun:test' {
  export type MockFunction = ITestMockFunction;
  export type Mock = ((impl?: MockFunction) => MockFunction) & {
    module: (path: string, factory: () => unknown) => void;
    clearAllMocks: () => void;
  };

  export const mock: Mock;

  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
}
