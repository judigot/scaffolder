import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSchemaFactory } from 'drizzle-zod';
import { db } from '../db';
import { orderProduct } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

// Create schema factory with date coercion (JSON sends ISO strings, Drizzle expects Date objects)
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

// Validation schemas - auto-generated from Drizzle schema
const createOrderProductSchema = createInsertSchema(orderProduct);

const updateOrderProductSchema = createOrderProductSchema.partial();

// GET all order_product
app.get('/', async (c) => {
  const result = await db.select().from(orderProduct);
  return c.json(result);
});

// GET single order_product by ID
app.get('/:orderId/:productId', async (c) => {
  const orderId = Number(c.req.param('orderId'));
  const productId = Number(c.req.param('productId'));
  const result = await db
    .select()
    .from(orderProduct)
    .where(
      and(
        eq(orderProduct.orderId, orderId),
        eq(orderProduct.productId, productId),
      ),
    );
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
app.put(
  '/:orderId/:productId',
  zValidator('json', updateOrderProductSchema),
  async (c) => {
    const orderId = Number(c.req.param('orderId'));
    const productId = Number(c.req.param('productId'));
    const data = c.req.valid('json');
    const result = await db
      .update(orderProduct)
      .set(data)
      .where(
        and(
          eq(orderProduct.orderId, orderId),
          eq(orderProduct.productId, productId),
        ),
      )
      .returning();
    if (result.length === 0) {
      return c.json({ error: 'OrderProduct not found' }, 404);
    }
    return c.json(result[0]);
  },
);

// DELETE order_product
app.delete('/:orderId/:productId', async (c) => {
  const orderId = Number(c.req.param('orderId'));
  const productId = Number(c.req.param('productId'));
  const result = await db
    .delete(orderProduct)
    .where(
      and(
        eq(orderProduct.orderId, orderId),
        eq(orderProduct.productId, productId),
      ),
    )
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'OrderProduct not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;