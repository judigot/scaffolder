import { afterAll, describe, expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { createApp } from '../src/app.ts';
import { loadAuthConfig } from '../src/auth/config.ts';
import { createAuth } from '../src/auth/index.ts';
import * as schema from '../src/db/schema.ts';

const client = new PGlite();
const db = drizzle(client, { schema });
await migrate(db, {
  migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
});
afterAll(async () => {
  await client.close();
});

const environment = {
  BETTER_AUTH_SECRET: 'test-only-authentication-secret-not-for-production',
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('optional Better Auth dashboard', () => {
  test('registers ownership verification and rejects unauthenticated admin access', async () => {
    const apiKey = 'test-only-dashboard-key';
    const config = loadAuthConfig({
      ...environment,
      BETTER_AUTH_API_KEY: apiKey,
    });
    expect(config.dashboardApiKey).toBe(apiKey);
    const auth = createAuth(
      drizzleAdapter(db, { provider: 'pg', schema }),
      config,
    );
    expect(auth.options.plugins?.map((plugin) => plugin.id)).toContain('dash');
    const app = createApp(() => auth);
    for (const path of ['/auth/dash/validate', '/auth/dash/config']) {
      const response = await app.request(`http://localhost:3000/api${path}`);
      expect(response.status).toBe(401);
      expect(await response.text()).not.toContain(apiKey);
    }
    expect(
      (await app.request('http://localhost:3000/api/auth/ok')).status,
    ).toBe(200);
    expect((await app.request('http://localhost:3000/api/me')).status).toBe(
      401,
    );
  });

  test('keeps self-hosted auth usable without an infrastructure key', async () => {
    const config = loadAuthConfig(environment);
    expect(config.dashboardApiKey).toBeUndefined();
    const auth = createAuth(
      drizzleAdapter(db, { provider: 'pg', schema }),
      config,
    );
    expect(
      auth.options.plugins?.map((plugin) => plugin.id) ?? [],
    ).not.toContain('dash');
    const app = createApp(() => auth);
    expect(
      (await app.request('http://localhost:3000/api/auth/ok')).status,
    ).toBe(200);
    expect(
      (await app.request('http://localhost:3000/api/auth/dash/validate'))
        .status,
    ).toBe(404);
  });

  test('rejects empty or whitespace-only infrastructure keys', () => {
    for (const apiKey of ['', '   ']) {
      expect(() =>
        loadAuthConfig({ ...environment, BETTER_AUTH_API_KEY: apiKey }),
      ).toThrow();
    }
  });
});
