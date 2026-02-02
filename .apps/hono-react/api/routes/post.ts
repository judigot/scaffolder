import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import { db } from '../db';
import { posts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, getUser } from '../middleware/auth';

const app = new Hono();

app.use('*', authMiddleware);

// Validation schemas - auto-generated from Drizzle schema
const createPostSchema = createInsertSchema(posts, {
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
}).omit({ id: true });

const updatePostSchema = createPostSchema.partial();

// GET all posts
app.get('/', async (c) => {
  const user = getUser(c);
  const result = await db.select().from(posts).where(eq(posts.userId, user.id));
  return c.json(result);
});

// GET single post by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = getUser(c);
  const result = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)));
  if (result.length === 0) {
    return c.json({ error: 'Post not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new post
app.post('/', zValidator('json', createPostSchema), async (c) => {
  const data = c.req.valid('json');

  const user = getUser(c);
  const result = await db
    .insert(posts)
    .values({ ...data, userId: user.id })
    .returning();
  return c.json(result[0], 201);
});

// PUT update post
app.put('/:id', zValidator('json', updatePostSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const user = getUser(c);
  const result = await db
    .update(posts)
    .set(data)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Post not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE post
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = getUser(c);
  const result = await db
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Post not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
