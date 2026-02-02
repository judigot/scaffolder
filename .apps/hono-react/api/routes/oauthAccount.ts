import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import { db } from '../db';
import { oauthAccount } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, getUser } from '../middleware/auth';

const app = new Hono();

app.use('*', authMiddleware);

// Validation schemas - auto-generated from Drizzle schema
const createOauthAccountSchema = createInsertSchema(oauthAccount, {
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
}).omit({ id: true });

const updateOauthAccountSchema = createOauthAccountSchema.partial();

// GET all oauth_account
app.get('/', async (c) => {
  const user = getUser(c);
  const result = await db
    .select()
    .from(oauthAccount)
    .where(eq(oauthAccount.userId, user.id));
  return c.json(result);
});

// GET single oauth_account by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = getUser(c);
  const result = await db
    .select()
    .from(oauthAccount)
    .where(and(eq(oauthAccount.id, id), eq(oauthAccount.userId, user.id)));
  if (result.length === 0) {
    return c.json({ error: 'OauthAccount not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new oauth_account
app.post('/', zValidator('json', createOauthAccountSchema), async (c) => {
  const data = c.req.valid('json');

  const user = getUser(c);
  const result = await db
    .insert(oauthAccount)
    .values({ ...data, userId: user.id })
    .returning();
  return c.json(result[0], 201);
});

// PUT update oauth_account
app.put('/:id', zValidator('json', updateOauthAccountSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const user = getUser(c);
  const result = await db
    .update(oauthAccount)
    .set(data)
    .where(and(eq(oauthAccount.id, id), eq(oauthAccount.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'OauthAccount not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE oauth_account
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const user = getUser(c);
  const result = await db
    .delete(oauthAccount)
    .where(and(eq(oauthAccount.id, id), eq(oauthAccount.userId, user.id)))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'OauthAccount not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
