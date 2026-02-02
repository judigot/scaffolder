import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', '**/*.vitest-only.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '.worktrees/**',
      '.vercel/**',
      '.apps/**',
      'e2e/**',
      '**/golden-projects/output/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
