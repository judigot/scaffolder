import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
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
    expect(auth.options.plugins.map((plugin) => plugin.id)).toContain('dash');
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
    expect(auth.options.plugins.map((plugin) => plugin.id)).not.toContain(
      'dash',
    );
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

  test('verifies signed ownership and preserves database auth with dashboard enabled', async () => {
    const apiKey = 'test-only-dashboard-lifecycle-key';
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const jwk = {
      ...publicKey.export({ format: 'jwk' }),
      kid: 'test-dashboard',
      alg: 'ES256',
    };
    const outboundPaths: string[] = [];
    const network = spyOn(globalThis, 'fetch').mockImplementation(
      Object.assign(
        (input: Parameters<typeof fetch>[0]) => {
          const url = new URL(
            input instanceof Request ? input.url : String(input),
          );
          outboundPaths.push(url.pathname);
          if (url.origin !== 'https://dash.better-auth.com') {
            throw new Error(
              'Unexpected external request in offline dashboard test',
            );
          }
          if (url.pathname === '/api/auth/jwks') {
            return Promise.resolve(Response.json({ keys: [jwk] }));
          }
          if (url.pathname === '/events/track') {
            return Promise.resolve(Response.json({ success: true }));
          }
          throw new Error('Unexpected dashboard endpoint in offline test');
        },
        {
          preconnect() {
            /* Offline tests never open provider connections. */
          },
        },
      ),
    );
    const backgroundTasks: Promise<unknown>[] = [];
    try {
      const auth = createAuth(
        drizzleAdapter(db, { provider: 'pg', schema }),
        loadAuthConfig({ ...environment, BETTER_AUTH_API_KEY: apiKey }),
      );
      const context = await auth.$context;
      context.runInBackground = (task) => {
        backgroundTasks.push(task);
      };
      const app = createApp(() => auth);
      function ownershipToken(key: string) {
        const iat = Math.floor(Date.now() / 1000);
        const header = Buffer.from(
          JSON.stringify({ alg: 'ES256', kid: jwk.kid }),
        ).toString('base64url');
        const payload = Buffer.from(
          JSON.stringify({
            iat,
            exp: iat + 60,
            apiKeyHash: createHash('sha256').update(key).digest('hex'),
          }),
        ).toString('base64url');
        const input = `${header}.${payload}`;
        const signature = sign('sha256', Buffer.from(input), {
          key: privateKey,
          dsaEncoding: 'ieee-p1363',
        }).toString('base64url');
        return `${input}.${signature}`;
      }
      for (const key of [apiKey, 'different-project-key']) {
        const response = await app.request(
          'http://localhost:3000/api/auth/dash/validate',
          {
            headers: { Authorization: `Bearer ${ownershipToken(key)}` },
          },
        );
        expect(response.status).toBe(key === apiKey ? 200 : 401);
        expect(await response.text()).not.toContain(apiKey);
      }
      const invalid = await app.request(
        'http://localhost:3000/api/auth/dash/validate',
        {
          headers: { Authorization: 'Bearer invalid.signature.token' },
        },
      );
      expect(invalid.status).toBe(401);

      const password = 'test-only-correct-horse-battery-staple';
      const email = 'dashboard-lifecycle@example.com';
      function post(
        path: string,
        body: Record<string, string>,
        cookie?: string,
      ) {
        const headers = new Headers({
          Origin: environment.BETTER_AUTH_URL,
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.0.2.250',
        });
        if (cookie !== undefined) {
          headers.set('Cookie', cookie);
        }
        return app.request(`${environment.BETTER_AUTH_URL}/api/auth/${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      }
      const signup = await post('sign-up/email', {
        name: 'Dashboard Example',
        email,
        password,
      });
      expect(signup.status).toBe(200);
      expect(await signup.text()).not.toContain(password);
      const login = await post('sign-in/email', { email, password });
      expect(login.status).toBe(200);
      const cookie = login.headers.get('set-cookie')?.split(';')[0];
      if (cookie === undefined) {
        throw new Error('Expected a dashboard-enabled session cookie');
      }
      const identity = await app.request('http://localhost:3000/api/me', {
        headers: { Cookie: cookie },
      });
      expect(identity.status).toBe(200);
      expect(await identity.text()).not.toContain(apiKey);
      expect((await post('sign-out', {}, cookie)).status).toBe(200);
      expect(
        (
          await app.request('http://localhost:3000/api/me', {
            headers: { Cookie: cookie },
          })
        ).status,
      ).toBe(401);
      expect(outboundPaths).toContain('/api/auth/jwks');
      expect(outboundPaths).toContain('/events/track');
    } finally {
      try {
        await Promise.all(backgroundTasks);
      } finally {
        network.mockRestore();
      }
    }
  });
});
