import { Hono } from 'hono';
import indexRouter from '@/app/routes/index.ts';

const app = new Hono();

app.route('/api', indexRouter);

export default app;
