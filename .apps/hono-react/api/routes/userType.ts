import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { userType } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createUserTypeSchema = createInsertSchema(userType).omit({ id: true });

const updateUserTypeSchema = createUserTypeSchema.partial();

// GET all user_type
app.get('/', async (c) => {
  const result = await db.select().from(userType);
  return c.json(result);
});

// GET single user_type by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db.select().from(userType).where(eq(userType.id, id));
  if (result.length === 0) {
    return c.json({ error: 'UserType not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new user_type
app.post('/', zValidator('json', createUserTypeSchema), async (c) => {
  const data = c.req.valid('json');

  const result = await db.insert(userType).values(data).returning();
  return c.json(result[0], 201);
});

// PUT update user_type
app.put('/:id', zValidator('json', updateUserTypeSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const result = await db
    .update(userType)
    .set(data)
    .where(eq(userType.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'UserType not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE user_type
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db
    .delete(userType)
    .where(eq(userType.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'UserType not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
