import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import { db } from '../db';
import { orderProduct } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Validation schemas - auto-generated from Drizzle schema
const createOrderProductSchema = createInsertSchema(orderProduct, {
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
}).omit({ id: true });

const updateOrderProductSchema = createOrderProductSchema.partial();

// GET all order_product
app.get('/', async (c) => {
  const result = await db.select().from(orderProduct);
  return c.json(result);
});

// GET single order_product by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db
    .select()
    .from(orderProduct)
    .where(eq(orderProduct.id, id));
  if (result.length === 0) {
    return c.json({ error: 'OrderProduct not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new order_product
app.post('/', zValidator('json', createOrderProductSchema), async (c) => {
  const data = c.req.valid('json');

  const result = await db.insert(orderProduct).values(data).returning();
  return c.json(result[0], 201);
});

// PUT update order_product
app.put('/:id', zValidator('json', updateOrderProductSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const result = await db
    .update(orderProduct)
    .set(data)
    .where(eq(orderProduct.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'OrderProduct not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE order_product
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db
    .delete(orderProduct)
    .where(eq(orderProduct.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'OrderProduct not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
