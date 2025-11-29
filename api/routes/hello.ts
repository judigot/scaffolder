// Basic hello hono route
import { Hono } from 'hono';

const router = new Hono();

router.get('/hello', (c) => {
  return c.json({ message: 'Hello, world!' });
});

export default router;
