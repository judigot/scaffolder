// Basin hono server that uses routes from src/app/routes
import { Hono } from 'hono';
import { router } from '@/app/routes';

const app = new Hono();

app.route('/api', router);

export default app;
