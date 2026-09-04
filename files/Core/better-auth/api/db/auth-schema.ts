import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './schema';

/**
 * Extra Better Auth tables. `user` and `session` stay in the generated schema
 * so `$SCHEMA_FILTER` keeps owning those shapes.
 */
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', {
    withTimezone: true,
    precision: 6,
  }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', {
    withTimezone: true,
    precision: 6,
  }),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'),
  createdAt: timestamp('createdAt', {
    withTimezone: true,
    precision: 6,
  }).notNull(),
  updatedAt: timestamp('updatedAt', {
    withTimezone: true,
    precision: 6,
  }).notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', {
    withTimezone: true,
    precision: 6,
  }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true, precision: 6 }),
  updatedAt: timestamp('updatedAt', { withTimezone: true, precision: 6 }),
});

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
