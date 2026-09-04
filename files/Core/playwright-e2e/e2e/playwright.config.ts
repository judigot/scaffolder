import { defineConfig, devices } from '@playwright/test';
import { apiOrigin, nextOrigin, viteOrigin } from './origins';

const isCi = process.env.CI !== undefined;

/*
 * Boots the real production stack: the workspace API, the built Vite app
 * behind `vite preview` (which proxies /api like the dev server), and
 * the built Next.js app pointed at the same API.
 *
 * 127.0.0.1 is used throughout so Node/Bun never try IPv6 `localhost`.
 * Override origins with E2E_API_ORIGIN / E2E_VITE_ORIGIN / E2E_NEXT_ORIGIN.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'bun run --cwd ../apps/api start',
      url: `${apiOrigin}/api/health`,
      reuseExistingServer: !isCi,
      timeout: 60_000,
    },
    {
      command:
        'bun run --cwd ../apps/vite build && bun run --cwd ../apps/vite preview --host 127.0.0.1 --port 3001',
      url: viteOrigin,
      reuseExistingServer: !isCi,
      timeout: 180_000,
    },
    {
      command:
        'bun run --cwd ../apps/nextjs build && bun run --cwd ../apps/nextjs start',
      url: nextOrigin,
      reuseExistingServer: !isCi,
      timeout: 180_000,
      env: {
        API_URL: apiOrigin,
      },
    },
  ],
});
