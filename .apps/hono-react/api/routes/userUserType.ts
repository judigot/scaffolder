import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { userUserType } from '../db/schema';
import { eq, and } from 'drizzle-orm';

import { generateIdFromEntropySize } from 'lucia';

const app = new Hono();

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createUserUserTypeSchema = createInsertSchema(userUserType);

const updateUserUserTypeSchema = createUserUserTypeSchema.partial();

// GET all user_user_type
app.get('/', async (c) => {
  const result = await db.select().from(userUserType);
  return c.json(result);
});

// GET single user_user_type by ID
app.get('/:userId/:userTypeId', async (c) => {
  const userId = c.req.param('userId');
  const userTypeId = Number(c.req.param('userTypeId'));
  const result = await db
    .select()
    .from(userUserType)
    .where(
      and(
        eq(userUserType.userId, userId),
        eq(userUserType.userTypeId, userTypeId),
      ),
    );
  if (result.length === 0) {
    return c.json({ error: 'UserUserType not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new user_user_type
app.post('/', zValidator('json', createUserUserTypeSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(userUserType).values(data).returning();
  return c.json(result[0], 201);
});

// PUT update user_user_type
app.put(
  '/:userId/:userTypeId',
  zValidator('json', updateUserUserTypeSchema),
  async (c) => {
    const userId = c.req.param('userId');
    const userTypeId = Number(c.req.param('userTypeId'));
    const data = c.req.valid('json');
    const result = await db
      .update(userUserType)
      .set(data)
      .where(
        and(
          eq(userUserType.userId, userId),
          eq(userUserType.userTypeId, userTypeId),
        ),
      )
      .returning();
    if (result.length === 0) {
      return c.json({ error: 'UserUserType not found' }, 404);
    }
    return c.json(result[0]);
  },
);

// DELETE user_user_type
app.delete('/:userId/:userTypeId', async (c) => {
  const userId = c.req.param('userId');
  const userTypeId = Number(c.req.param('userTypeId'));
  const result = await db
    .delete(userUserType)
    .where(
      and(
        eq(userUserType.userId, userId),
        eq(userUserType.userTypeId, userTypeId),
      ),
    )
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'UserUserType not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;