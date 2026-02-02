import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { session } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, getUser } from '../middleware/auth';
import { generateIdFromEntropySize } from 'lucia';

const app = new Hono();

app.use('*', authMiddleware);

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createSessionSchema = createInsertSchema(session).omit({ id: true });

const updateSessionSchema = createSessionSchema.partial();

// GET all session
app.get('/', async (c) => {
  const user = getUser(c);
  const result = await db
    .select()
    .from(session)
    .where(eq(session.userId, user.id));
  return c.json(result);
});

// GET single session by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = getUser(c);
  const result = await db
    .select()
    .from(session)
    .where(and(eq(session.id, id), eq(session.userId, user.id)));
  if (result.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new session
app.post('/', zValidator('json', createSessionSchema), async (c) => {
  const data = c.req.valid('json');
  const id = generateIdFromEntropySize(10);
  const user = getUser(c);
  const result = await db
    .insert(session)
    .values({ ...data, id, userId: user.id })
    .returning();
  return c.json(result[0], 201);
});

// PUT update session
app.put('/:id', zValidator('json', updateSessionSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const user = getUser(c);
  const result = await db
    .update(session)
    .set(data)
    .where(and(eq(session.id, id), eq(session.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE session
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = getUser(c);
  const result = await db
    .delete(session)
    .where(and(eq(session.id, id), eq(session.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
