import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { order } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createOrderSchema = createInsertSchema(order).omit({ id: true });

const updateOrderSchema = createOrderSchema.partial();

// GET all order
app.get('/', async (c) => {
  const result = await db.select().from(order);
  return c.json(result);
});

// GET single order by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db.select().from(order).where(eq(order.id, id));
  if (result.length === 0) {
    return c.json({ error: 'Order not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new order
app.post('/', zValidator('json', createOrderSchema), async (c) => {
  const data = c.req.valid('json');

  const result = await db.insert(order).values(data).returning();
  return c.json(result[0], 201);
});

// PUT update order
app.put('/:id', zValidator('json', updateOrderSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const result = await db
    .update(order)
    .set(data)
    .where(eq(order.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Order not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE order
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db.delete(order).where(eq(order.id, id)).returning();
  if (result.length === 0) {
    return c.json({ error: 'Order not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;