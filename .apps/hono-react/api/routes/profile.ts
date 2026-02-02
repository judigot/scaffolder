import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { profile } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, getUser } from '../middleware/auth';

const app = new Hono();

app.use('*', authMiddleware);

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createProfileSchema = createInsertSchema(profile).omit({ id: true });

const updateProfileSchema = createProfileSchema.partial();

// GET all profile
app.get('/', async (c) => {
  const user = getUser(c);
  const result = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, user.id));
  return c.json(result);
});

// GET single profile by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = getUser(c);
  const result = await db
    .select()
    .from(profile)
    .where(and(eq(profile.id, id), eq(profile.userId, user.id)));
  if (result.length === 0) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new profile
app.post('/', zValidator('json', createProfileSchema), async (c) => {
  const data = c.req.valid('json');

  const user = getUser(c);
  const result = await db
    .insert(profile)
    .values({ ...data, userId: user.id })
    .returning();
  return c.json(result[0], 201);
});

// PUT update profile
app.put('/:id', zValidator('json', updateProfileSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const user = getUser(c);
  const result = await db
    .update(profile)
    .set(data)
    .where(and(eq(profile.id, id), eq(profile.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE profile
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = getUser(c);
  const result = await db
    .delete(profile)
    .where(and(eq(profile.id, id), eq(profile.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;