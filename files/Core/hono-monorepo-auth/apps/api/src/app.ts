import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { getAuth } from './auth/index.ts';
import { parseCorsOrigins } from './env.ts';
import { healthRouter } from './routes/health.ts';
import { helloRouter } from './routes/hello.ts';

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

export function resolveAllowedOrigins(): string[] {
  const configured = parseCorsOrigins();
  if (configured === undefined || configured.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    return DEVELOPMENT_ORIGINS;
  }
  return configured;
}

export function createApp(authProvider: typeof getAuth = getAuth): Hono {
  const app = new Hono().basePath('/api');
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: resolveAllowedOrigins(),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use('*', bodyLimit({ maxSize: 1024 * 1024 }));
  app.route('/hello', helloRouter);
  app.route('/health', healthRouter);
  app.all('/auth/*', async (c) => {
    const auth = authProvider();
    const origin = c.req.header('Origin');
    const context = await auth.$context;
    if (origin !== undefined && !context.trustedOrigins.includes(origin)) {
      return c.json({ error: 'Forbidden origin' }, 403);
    }
    return auth.handler(c.req.raw);
  });
  app.get('/me', async (c) => {
    const identity = await authProvider().api.getSession({
      headers: c.req.raw.headers,
    });
    if (identity === null) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.json({ user: identity.user });
  });
  app.notFound((c) => c.json({ error: 'Not Found' }, 404));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  });
  return app;
}

export const app = createApp();
