// Basin hono server that uses routes from src/app/routes
import { Hono } from 'hono';
import indexRouter from '@/app/routes/index.ts';

const app = new Hono();

// Add api prefix to all routes without duplicating the /api prefix
app.route('/api', indexRouter);

export default app;
