import { createRequire } from 'node:module';

type MockFactory<T> = () => T;
type MockFunction = (...args: unknown[]) => unknown;
type BunMock = ((impl?: MockFunction) => MockFunction) & {
  module: (path: string, factory: MockFactory<unknown>) => void;
  clearAllMocks: () => void;
};
interface IViLike {
  mock: (id: string, factory: MockFactory<unknown>) => void;
  fn: (impl?: MockFunction) => MockFunction;
  clearAllMocks: () => void;
}

const require = createRequire(import.meta.url);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isViLike = (value: unknown): value is IViLike => {
  if (!isObject(value)) {
    return false;
  }
  const mock = value.mock;
  const fn = value.fn;
  const clearAllMocks = value.clearAllMocks;
  return (
    typeof mock === 'function' &&
    typeof fn === 'function' &&
    typeof clearAllMocks === 'function'
  );
};

const getGlobalVi = (): IViLike | null => {
  const candidate = typeof vi === 'undefined' ? undefined : vi;
  return isViLike(candidate) ? candidate : null;
};

const isBunMock = (value: unknown): value is BunMock => {
  if (typeof value !== 'function') {
    return false;
  }
  if (!('module' in value) || !('clearAllMocks' in value)) {
    return false;
  }
  const moduleFn = value.module;
  const clearAllMocks = value.clearAllMocks;
  return typeof moduleFn === 'function' && typeof clearAllMocks === 'function';
};

const getBunMock = (): BunMock => {
  const bunTest: unknown = require('bun:test');
  if (!isObject(bunTest)) {
    throw new Error('bun:test mock API is unavailable');
  }
  const candidate = bunTest.mock;
  if (!isBunMock(candidate)) {
    throw new Error('bun:test mock API is unavailable');
  }
  return candidate;
};

export const mockModule = (
  path: string,
  factory: MockFactory<unknown>,
): void => {
  const vi = getGlobalVi();
  if (vi) {
    vi.mock(path, factory);
    return;
  }

  const bunMock = getBunMock();
  bunMock.module(path, factory);
};

export const mockFn = (impl?: MockFunction): MockFunction => {
  const vi = getGlobalVi();
  if (vi) {
    return vi.fn(impl);
  }

  const bunMock = getBunMock();
  return bunMock(impl);
};

export const clearAllMocks = (): void => {
  const vi = getGlobalVi();
  if (vi) {
    vi.clearAllMocks();
    return;
  }

  const bunMock = getBunMock();
  bunMock.clearAllMocks();
};
