import {
  pgTable,
  bigserial,
  bigint,
  boolean,
  timestamp,
  text,
  varchar,
  char,
} from 'drizzle-orm/pg-core';

// Product table
export const product = pgTable('product', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productName: text('product_name').notNull(),
});

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
// Customer table
export const customer = pgTable('customer', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
});

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;
// Order table
export const order = pgTable('order', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  customerId: bigint('customer_id', { mode: 'number' }).notNull(),
});

export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
// OrderProduct table
export const orderProduct = pgTable('order_product', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: bigint('order_id', { mode: 'number' }).notNull(),
  productId: bigint('product_id', { mode: 'number' }).notNull(),
});

export type OrderProduct = typeof orderProduct.$inferSelect;
export type NewOrderProduct = typeof orderProduct.$inferInsert;
// User table
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  username: text('username').notNull(),
  passwordHash: text('password_hash'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
// Session table
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    precision: 6,
  }).notNull(),
});

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
// OauthAccount table
export const oauthAccount = pgTable('oauth_account', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  providerId: text('provider_id').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  userId: text('user_id').notNull(),
});

export type OauthAccount = typeof oauthAccount.$inferSelect;
export type NewOauthAccount = typeof oauthAccount.$inferInsert;
// Profile table
export const profile = pgTable('profile', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull(),
  bio: text('bio').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
// Post table
export const posts = pgTable('posts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
// UserType table
export const userType = pgTable('user_type', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export type UserType = typeof userType.$inferSelect;
export type NewUserType = typeof userType.$inferInsert;
// UserUserType table
export const userUserType = pgTable('user_user_type', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull(),
  userTypeId: bigint('user_type_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 6 }),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 6 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, precision: 6 }),
});

export type UserUserType = typeof userUserType.$inferSelect;
export type NewUserUserType = typeof userUserType.$inferInsert;
