import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import indexRouter from '@/app/routes/index.ts';

const app = new Hono();

const API_URL = `/${String(process.env.VITE_API_URL ?? 'api')}`;

app.use('*', cors());
app.use(API_URL, compress());
app.use(API_URL, bodyLimit({ maxSize: 100 * 1024 * 1024 }));

app.route(`/${String(process.env.VITE_API_URL ?? 'api')}`, indexRouter);

if (process.env.VERCEL !== '1') {
  if (process.env.NODE_ENV !== 'development') {
    app.get('*', serveStatic({ root: 'dist' }));
  } else {
    app.all('*', async (c) => {
      const path = c.req.path;
      const apiPath = `/${String(process.env.VITE_API_URL ?? 'api')}`;
      if (path.startsWith(apiPath)) {
        return c.text('Not Found', 404);
      }
      const port = String(process.env.VITE_FRONTEND_PORT);
      const host = String(process.env.VITE_BACKEND_HOST ?? 'http://localhost');
      const queryString = c.req.query() ? `?${new URLSearchParams(c.req.query()).toString()}` : '';
      const url = `${host}:${port}${path}${queryString}`;
      try {
        const headers: Record<string, string> = {};
        c.req.raw.headers.forEach((value, key) => {
          if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
            headers[key] = value;
          }
        });
        const init: RequestInit = {
          method: c.req.method,
          headers,
        };
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
          init.body = await c.req.raw.clone().arrayBuffer();
        }
        const response = await fetch(url, init);
        const body = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') ?? 'text/html';
        c.header('Content-Type', contentType);
        response.headers.forEach((value, key) => {
          if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
            c.header(key, value);
          }
        });
        return c.body(body);
      } catch (error) {
        console.error('Proxy error:', error);
        return c.text(`Proxy Error: ${String(error)}`, 502);
      }
    });
  }
}

const hono: { fetch: typeof app.fetch; port?: number; hostname?: string } = {
  fetch: app.fetch,
};

if (process.env.VERCEL !== '1') {
  hono.port = Number(process.env.VITE_BACKEND_PORT);
  hono.hostname = process.env.VITE_BACKEND_HOSTNAME ?? '0.0.0.0';
}

export default hono;
