import { Hono } from 'hono';

const router = new Hono();

router.get('/', (c) => {
  return c.json({ message: 'Hello, another!' });
});

export default router;
