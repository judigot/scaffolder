import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import { db } from '../db';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';

import { generateIdFromEntropySize } from 'lucia';

const app = new Hono();

// Validation schemas - auto-generated from Drizzle schema
const createUserSchema = createInsertSchema(user, {
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
}).omit({ id: true });

const updateUserSchema = createUserSchema.partial();

// GET all user
app.get('/', async (c) => {
  const result = await db.select().from(user);
  return c.json(result);
});

// GET single user by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await db.select().from(user).where(eq(user.id, id));
  if (result.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new user
app.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const id = generateIdFromEntropySize(10);
  const result = await db
    .insert(user)
    .values({ ...data, id })
    .returning();
  return c.json(result[0], 201);
});

// PUT update user
app.put('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const result = await db
    .update(user)
    .set(data)
    .where(eq(user.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE user
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await db.delete(user).where(eq(user.id, id)).returning();
  if (result.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
