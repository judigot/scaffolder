import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

expect.extend({
  toHaveBeenCalledWithDelay(
    received: Record<PropertyKey, Record<PropertyKey, string>>,
    _callback,
    timeout,
  ) {
    const start = Date.now();
    let wasCalled = false;

    const checkCalls = () => {
      if (received.mock.calls.length > 0) {
        wasCalled = true;
      }
      if (!wasCalled && Date.now() - start < timeout) {
        setTimeout(checkCalls, 10);
      }
    };

    checkCalls();

    return {
      message: () =>
        `expected function to have been called within ${String(timeout)}ms`,
      pass: wasCalled,
    };
  },
});
