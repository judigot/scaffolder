import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { oauthAccount } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, getUser } from '../middleware/auth';
import { generateIdFromEntropySize } from 'lucia';

const app = new Hono();

app.use('*', authMiddleware);

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createOauthAccountSchema = createInsertSchema(oauthAccount);

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
app.get('/:providerId/:providerUserId', async (c) => {
  const providerId = c.req.param('providerId');
  const providerUserId = c.req.param('providerUserId');
  const result = await db
    .select()
    .from(oauthAccount)
    .where(
      and(
        eq(oauthAccount.providerId, providerId),
        eq(oauthAccount.providerUserId, providerUserId),
      ),
    );
  if (result.length === 0) {
    return c.json({ error: 'OauthAccount not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new oauth_account
app.post('/', zValidator('json', createOauthAccountSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(oauthAccount).values(data).returning();
  return c.json(result[0], 201);
});

// PUT update oauth_account
app.put(
  '/:providerId/:providerUserId',
  zValidator('json', updateOauthAccountSchema),
  async (c) => {
    const providerId = c.req.param('providerId');
    const providerUserId = c.req.param('providerUserId');
    const data = c.req.valid('json');
    const result = await db
      .update(oauthAccount)
      .set(data)
      .where(
        and(
          eq(oauthAccount.providerId, providerId),
          eq(oauthAccount.providerUserId, providerUserId),
        ),
      )
      .returning();
    if (result.length === 0) {
      return c.json({ error: 'OauthAccount not found' }, 404);
    }
    return c.json(result[0]);
  },
);

// DELETE oauth_account
app.delete('/:providerId/:providerUserId', async (c) => {
  const providerId = c.req.param('providerId');
  const providerUserId = c.req.param('providerUserId');
  const result = await db
    .delete(oauthAccount)
    .where(
      and(
        eq(oauthAccount.providerId, providerId),
        eq(oauthAccount.providerUserId, providerUserId),
      ),
    )
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'OauthAccount not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;