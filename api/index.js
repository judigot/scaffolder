import { Hono } from 'hono';
import { serve } from '@hono/node-server'; // For Node.js runtime

const app = new Hono();

app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello, Hono!' });
});

// For Node.js runtime
serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  },
);

// For other runtimes (e.g., Cloudflare Workers, Deno, Bun), you would export the app directly:
export default app;
