// import hello.ts and another.ts and use hono router to combine them
import { Hono } from 'hono';
import helloRouter from './hello.ts';
import anotherRouter from './another.ts';

const router = new Hono();

router.route('/hello', helloRouter);
router.route('/another', anotherRouter);

export default router;
