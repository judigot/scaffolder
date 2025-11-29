import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import indexRouter from '@/app/routes/index.ts';

const app = new Hono();

const API_PREFIX = `/${String(process.env.VITE_API_URL)}`;

const apiRouter = new Hono();
apiRouter.use('*', compress());
apiRouter.use('*', bodyLimit({ maxSize: 100 * 1024 * 1024 }));
apiRouter.use('*', cors());
apiRouter.route('/', indexRouter);

app.route(API_PREFIX, apiRouter);

if (process.env.VERCEL !== '1') {
  if (process.env.NODE_ENV !== 'development') {
    app.get('*', serveStatic({ root: 'dist' }));
  } else {
    app.get('*', (c) => {
      const port = String(process.env.VITE_FRONTEND_PORT);
      const url = `${String(process.env.VITE_BACKEND_HOST)}:${port}${c.req.path}`;
      return c.redirect(url, 302);
    });
  }
}

const hono: { fetch: typeof app.fetch; port?: number } = { fetch: app.fetch };

if (process.env.VERCEL !== '1') {
  hono.port = Number(process.env.VITE_BACKEND_PORT);
}

export default hono;
