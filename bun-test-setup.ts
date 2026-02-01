/**
 * Bun test setup file
 * Registers happy-dom globals and configures the test environment
 *
 * Note: Tests using vi.mock() are named *.vitest-only.tsx and excluded from bun test
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, afterEach, beforeAll, mock } from 'bun:test';
import { cleanup } from '@testing-library/react';
import { resetMockApiState, server } from './src/test/mocks/server.ts';

// Register happy-dom globals (document, window, etc.)
GlobalRegistrator.register();

// MSW Server Lifecycle
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockApiState();
});

afterAll(() => {
  server.close();
});

// Mock ResizeObserver (not provided by happy-dom)
class MockResizeObserver {
  observe(): void {
    // Stub - happy-dom doesn't provide ResizeObserver
  }
  unobserve(): void {
    // Stub
  }
  disconnect(): void {
    // Stub
  }
}
globalThis.ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Mock matchMedia (not fully implemented in happy-dom)
const mockMatchMedia = mock((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: mock(() => undefined),
  removeListener: mock(() => undefined),
  addEventListener: mock(() => undefined),
  removeEventListener: mock(() => undefined),
  dispatchEvent: mock(() => false),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});
