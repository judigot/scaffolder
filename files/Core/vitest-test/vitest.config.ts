import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
    // Run tests sequentially for CRUD testing order
    sequence: {
      shuffle: false,
    },
    // Increased timeout for database operations
    testTimeout: 10000,
  },
});
