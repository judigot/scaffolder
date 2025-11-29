import { Hono } from 'hono';
import { compress } from 'hono/compress';
// import { bodyLimit } from 'hono/body-limit';
// import { cors } from 'hono/cors';
// import { serveStatic } from '@hono/node-server/serve-static';
import indexRouter from '@/app/routes/index.ts';

const app = new Hono();

app.use('*', compress());
// app.use('*', bodyLimit({ maxSize: 100 * 1024 * 1024 }));
// app.use('*', cors());

app.route('/api', indexRouter);

// if (process.env.VERCEL !== '1') {
//   if (process.env.NODE_ENV !== 'development') {
//     app.get('*', serveStatic({ root: 'dist' }));
//   } else {
//     app.get('*', (c) => {
//       const port = String(process.env.VITE_FRONTEND_PORT);
//       const url = `http://localhost:${port}${c.req.path}`;
//       return c.redirect(url, 302);
//     });
//   }
// }

// const hono = { port: Number(process.env.VITE_BACKEND_PORT), fetch: app.fetch };

// if (process.env.VERCEL !== '1') {
//   hono.port = Number(process.env.VITE_BACKEND_PORT);
// }

// export default hono;
export default app;
