import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import { db } from '../db';
import { customer } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Validation schemas - auto-generated from Drizzle schema
const createCustomerSchema = createInsertSchema(customer, {
  createdAt: (schema) => schema.optional(),
  updatedAt: (schema) => schema.optional(),
}).omit({ id: true });

const updateCustomerSchema = createCustomerSchema.partial();

// GET all customer
app.get('/', async (c) => {
  const result = await db.select().from(customer);
  return c.json(result);
});

// GET single customer by ID
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db.select().from(customer).where(eq(customer.id, id));
  if (result.length === 0) {
    return c.json({ error: 'Customer not found' }, 404);
  }
  return c.json(result[0]);
});

// POST create new customer
app.post('/', zValidator('json', createCustomerSchema), async (c) => {
  const data = c.req.valid('json');

  const result = await db.insert(customer).values(data).returning();
  return c.json(result[0], 201);
});

// PUT update customer
app.put('/:id', zValidator('json', updateCustomerSchema), async (c) => {
  const id = Number(c.req.param('id'));
  const data = c.req.valid('json');
  const result = await db
    .update(customer)
    .set(data)
    .where(eq(customer.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Customer not found' }, 404);
  }
  return c.json(result[0]);
});

// DELETE customer
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await db
    .delete(customer)
    .where(eq(customer.id, id))
    .returning();
  if (result.length === 0) {
    return c.json({ error: 'Customer not found' }, 404);
  }
  return c.json({ success: true });
});

export default app;
