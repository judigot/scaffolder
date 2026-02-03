/**
 * Database Seeder
 *
 * Seeds the database with sample data.
 * Run: bun run db:seed
 */

import { db } from './index';
import { product } from './schema';
import { customer } from './schema';
import { order } from './schema';
import { orderProduct } from './schema';
import { user } from './schema';
import { session } from './schema';
import { oauthAccount } from './schema';
import { profile } from './schema';
import { posts } from './schema';
import { userType } from './schema';
import { userUserType } from './schema';

// Generated seed data
const seedData = {
  product: [
    {
      id: 1,
      productName: 'Hassan',
    },
    {
      id: 2,
      productName: 'Aisha',
    },
    {
      id: 3,
      productName: 'Sheridan',
    },
    {
      id: 4,
      productName: 'Stephany',
    },
    {
      id: 5,
      productName: 'Jamir',
    },
    {
      id: 6,
      productName: 'Alvis',
    },
    {
      id: 7,
      productName: 'Avis',
    },
    {
      id: 8,
      productName: 'Colten',
    },
    {
      id: 9,
      productName: 'Brenna',
    },
    {
      id: 10,
      productName: 'Elfrieda',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Jeanne',
    },
    {
      id: 2,
      name: 'Leonie',
    },
    {
      id: 3,
      name: 'Zola',
    },
    {
      id: 4,
      name: 'Kenyon',
    },
    {
      id: 5,
      name: 'Tevin',
    },
    {
      id: 6,
      name: 'Jayme',
    },
    {
      id: 7,
      name: 'Carlo',
    },
    {
      id: 8,
      name: 'Shana',
    },
    {
      id: 9,
      name: 'Royce',
    },
    {
      id: 10,
      name: 'Herminia',
    },
  ],
  order: [
    {
      id: 1,
      customerId: 1,
    },
    {
      id: 2,
      customerId: 2,
    },
    {
      id: 3,
      customerId: 3,
    },
    {
      id: 4,
      customerId: 4,
    },
    {
      id: 5,
      customerId: 5,
    },
    {
      id: 6,
      customerId: 6,
    },
    {
      id: 7,
      customerId: 7,
    },
    {
      id: 8,
      customerId: 8,
    },
    {
      id: 9,
      customerId: 9,
    },
    {
      id: 10,
      customerId: 10,
    },
  ],
  order_product: [
    {
      orderId: 1,
      productId: 1,
    },
    {
      orderId: 2,
      productId: 2,
    },
    {
      orderId: 3,
      productId: 3,
    },
    {
      orderId: 4,
      productId: 4,
    },
    {
      orderId: 5,
      productId: 5,
    },
    {
      orderId: 6,
      productId: 6,
    },
    {
      orderId: 7,
      productId: 7,
    },
    {
      orderId: 8,
      productId: 8,
    },
    {
      orderId: 9,
      productId: 9,
    },
    {
      orderId: 10,
      productId: 10,
    },
  ],
  user: [
    {
      id: 1,
      email: 'cordell5@example.net',
      username: 'geoffrey_krajcik',
      passwordHash: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      emailVerified: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      email: 'karl.marquardt@example.net',
      username: 'fredy.tremblay',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Norma',
      lastName: 'Evalyn',
      avatarUrl: 'incidunt',
      emailVerified: true,
      createdAt: '2025-03-27T01:29:49.860Z',
      updatedAt: '2025-05-23T11:27:04.692Z',
    },
    {
      id: 3,
      email: 'tiffany65@example.net',
      username: 'sim44',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Giuseppe',
      lastName: 'Jeramie',
      avatarUrl: 'deludo',
      emailVerified: false,
      createdAt: '2025-09-05T02:34:28.650Z',
      updatedAt: '2025-06-24T12:55:24.400Z',
    },
    {
      id: 4,
      email: 'savannah94@example.com',
      username: 'estrella_lang',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Nadia',
      lastName: 'Wanda',
      avatarUrl: 'iusto',
      emailVerified: true,
      createdAt: '2025-10-18T12:27:48.382Z',
      updatedAt: '2026-02-01T04:33:50.601Z',
    },
    {
      id: 5,
      email: 'myron.bernhard16@example.com',
      username: 'camilla_murphy',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Ron',
      lastName: 'Richard',
      avatarUrl: 'consectetur',
      emailVerified: true,
      createdAt: '2025-06-28T12:09:45.340Z',
      updatedAt: '2026-01-18T09:15:09.721Z',
    },
    {
      id: 6,
      email: 'julia_marquardt-grant17@example.org',
      username: 'ronaldo_fadel',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Tre',
      lastName: 'Hollis',
      avatarUrl: 'sublime',
      emailVerified: true,
      createdAt: '2025-03-03T07:49:39.330Z',
      updatedAt: '2025-07-10T21:04:29.112Z',
    },
    {
      id: 7,
      email: 'carlos_denesik@example.org',
      username: 'jalon_hartmann',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Janelle',
      lastName: 'Jaeden',
      avatarUrl: 'curis',
      emailVerified: false,
      createdAt: '2025-12-23T08:02:33.750Z',
      updatedAt: '2025-05-15T07:27:12.142Z',
    },
    {
      id: 8,
      email: 'sincere.schimmel@example.com',
      username: 'mackenzie_graham60',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Jalon',
      lastName: 'Aaron',
      avatarUrl: 'decet',
      emailVerified: false,
      createdAt: '2025-12-22T19:37:15.771Z',
      updatedAt: '2025-05-01T03:23:25.364Z',
    },
    {
      id: 9,
      email: 'fae.stanton@example.com',
      username: 'enid23',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Weston',
      lastName: 'Keira',
      avatarUrl: 'conservo',
      emailVerified: false,
      createdAt: '2025-04-01T08:40:30.680Z',
      updatedAt: '2026-01-05T15:37:59.317Z',
    },
    {
      id: 10,
      email: 'dejuan.mcclure@example.org',
      username: 'dimitri.wehner72',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Lynn',
      lastName: 'Lola',
      avatarUrl: 'universe',
      emailVerified: true,
      createdAt: '2026-02-02T10:33:15.770Z',
      updatedAt: '2025-02-22T21:53:30.983Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-04-29T01:33:24.625Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2025-07-24T01:55:09.547Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2026-01-14T00:36:58.786Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2025-08-19T09:09:44.865Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-10-01T11:38:04.380Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2025-08-27T21:17:34.126Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2025-04-23T12:09:33.533Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2025-10-18T15:33:21.126Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-06-15T20:49:28.824Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-02-23T20:32:44.140Z',
    },
  ],
  oauth_account: [
    {
      providerId: 'tamen',
      providerUserId: 'unde',
      userId: 1,
    },
    {
      providerId: 'coepi',
      providerUserId: 'sint',
      userId: 2,
    },
    {
      providerId: 'aurum',
      providerUserId: 'cogito',
      userId: 3,
    },
    {
      providerId: 'defendo',
      providerUserId: 'centum',
      userId: 4,
    },
    {
      providerId: 'voluntarius',
      providerUserId: 'sapiente',
      userId: 5,
    },
    {
      providerId: 'adeo',
      providerUserId: 'varietas',
      userId: 6,
    },
    {
      providerId: 'eius',
      providerUserId: 'congregatio',
      userId: 7,
    },
    {
      providerId: 'cubo',
      providerUserId: 'spargo',
      userId: 8,
    },
    {
      providerId: 'textilis',
      providerUserId: 'omnis',
      userId: 9,
    },
    {
      providerId: 'supplanto',
      providerUserId: 'cetera',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'audentia',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'desino',
      createdAt: '2025-03-28T22:11:11.468Z',
      updatedAt: '2025-10-20T00:30:43.840Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'quos',
      createdAt: '2025-08-17T03:02:01.427Z',
      updatedAt: '2025-11-15T16:59:59.320Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'rerum',
      createdAt: '2025-07-08T10:07:55.468Z',
      updatedAt: '2025-04-25T03:45:31.469Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'audio',
      createdAt: '2025-04-10T06:17:35.953Z',
      updatedAt: '2025-03-30T06:51:07.651Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'atqui',
      createdAt: '2025-02-16T19:05:30.290Z',
      updatedAt: '2025-05-16T14:56:52.752Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'doloribus',
      createdAt: '2026-01-13T14:38:08.786Z',
      updatedAt: '2025-10-01T19:32:27.460Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'deripio',
      createdAt: '2025-08-10T06:53:43.410Z',
      updatedAt: '2025-09-21T19:38:21.741Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'cilicium',
      createdAt: '2025-10-07T17:22:56.683Z',
      updatedAt: '2025-08-23T17:13:16.850Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'alo',
      createdAt: '2025-10-03T06:33:42.407Z',
      updatedAt: '2026-01-29T14:01:39.632Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'aperio',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'utroque',
      content: 'alius',
      createdAt: '2025-06-25T08:55:39.686Z',
      updatedAt: '2025-04-07T04:32:27.670Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'cerno',
      content: 'cur',
      createdAt: '2025-03-25T21:06:58.560Z',
      updatedAt: '2025-04-11T14:05:44.963Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'tego',
      content: 'conor',
      createdAt: '2025-07-29T17:32:00.559Z',
      updatedAt: '2025-04-02T15:06:23.777Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'cubo',
      content: 'compello',
      createdAt: '2025-08-18T05:57:06.200Z',
      updatedAt: '2025-04-06T21:56:50.328Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'denuo',
      content: 'praesentium',
      createdAt: '2025-08-05T20:28:27.208Z',
      updatedAt: '2025-12-12T03:52:46.712Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'vindico',
      content: 'aeternus',
      createdAt: '2025-06-23T23:49:40.287Z',
      updatedAt: '2025-03-18T04:20:02.170Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'verbera',
      content: 'demitto',
      createdAt: '2025-11-17T12:22:13.534Z',
      updatedAt: '2025-05-17T05:39:45.893Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'claro',
      content: 'colligo',
      createdAt: '2025-11-22T14:49:11.799Z',
      updatedAt: '2025-10-09T05:49:17.988Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'allatus',
      content: 'blanditiis',
      createdAt: '2025-11-29T00:41:19.944Z',
      updatedAt: '2025-09-23T13:16:52.835Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Thea',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Bradley',
      createdAt: '2025-02-05T16:04:24.303Z',
      updatedAt: '2025-03-02T15:45:01.345Z',
      deletedAt: '2025-11-17T18:47:11.505Z',
    },
    {
      id: 3,
      name: 'Garett',
      createdAt: '2025-06-11T18:39:49.613Z',
      updatedAt: '2025-08-11T08:03:32.204Z',
      deletedAt: '2025-12-02T10:55:10.717Z',
    },
    {
      id: 4,
      name: 'Stella',
      createdAt: '2025-12-07T16:59:30.940Z',
      updatedAt: '2025-04-24T11:15:27.916Z',
      deletedAt: '2025-12-18T06:26:49.651Z',
    },
    {
      id: 5,
      name: 'Enoch',
      createdAt: '2025-02-05T21:45:26.601Z',
      updatedAt: '2025-03-20T12:37:57.306Z',
      deletedAt: '2025-05-09T01:07:36.240Z',
    },
    {
      id: 6,
      name: 'Moriah',
      createdAt: '2025-03-21T05:03:40.914Z',
      updatedAt: '2025-11-13T04:57:34.760Z',
      deletedAt: '2025-05-15T04:33:12.998Z',
    },
    {
      id: 7,
      name: 'Makayla',
      createdAt: '2025-04-24T08:43:08.279Z',
      updatedAt: '2025-09-06T00:11:20.756Z',
      deletedAt: '2025-08-10T09:54:18.821Z',
    },
    {
      id: 8,
      name: 'Aglae',
      createdAt: '2025-10-25T20:06:06.560Z',
      updatedAt: '2025-07-05T12:04:33.597Z',
      deletedAt: '2025-05-29T22:20:32.510Z',
    },
    {
      id: 9,
      name: 'Jamie',
      createdAt: '2025-09-16T01:22:35.838Z',
      updatedAt: '2026-01-20T05:24:23.891Z',
      deletedAt: '2025-08-11T16:58:15.827Z',
    },
    {
      id: 10,
      name: 'Lawson',
      createdAt: '2025-07-03T16:37:46.407Z',
      updatedAt: '2025-03-14T18:54:48.778Z',
      deletedAt: '2025-07-18T02:04:25.834Z',
    },
  ],
  user_user_type: [
    {
      userId: 1,
      userTypeId: 1,
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      userId: 2,
      userTypeId: 2,
      createdAt: '2025-06-12T23:14:49.735Z',
      updatedAt: '2025-12-10T16:31:39.671Z',
      deletedAt: '2025-07-22T16:03:16.881Z',
    },
    {
      userId: 3,
      userTypeId: 3,
      createdAt: '2025-02-12T14:09:33.868Z',
      updatedAt: '2025-11-08T16:41:10.300Z',
      deletedAt: '2025-06-24T08:37:40.509Z',
    },
    {
      userId: 4,
      userTypeId: 4,
      createdAt: '2026-01-30T22:06:16.287Z',
      updatedAt: '2025-11-27T01:15:08.510Z',
      deletedAt: '2025-10-04T13:53:44.349Z',
    },
    {
      userId: 5,
      userTypeId: 5,
      createdAt: '2025-07-01T11:10:54.622Z',
      updatedAt: '2025-11-15T14:41:28.436Z',
      deletedAt: '2025-11-07T15:20:10.109Z',
    },
    {
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-04-09T07:06:06.222Z',
      updatedAt: '2026-01-08T08:42:37.313Z',
      deletedAt: '2025-09-14T14:56:47.572Z',
    },
    {
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-03-01T04:44:35.438Z',
      updatedAt: '2025-12-22T23:00:46.754Z',
      deletedAt: '2025-10-21T01:07:45.276Z',
    },
    {
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-12-25T03:22:22.158Z',
      updatedAt: '2025-03-23T06:23:56.587Z',
      deletedAt: '2025-04-13T08:03:13.517Z',
    },
    {
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-07-30T01:40:36.360Z',
      updatedAt: '2025-09-23T12:28:20.208Z',
      deletedAt: '2025-04-05T23:51:55.754Z',
    },
    {
      userId: 10,
      userTypeId: 10,
      createdAt: '2025-12-14T15:17:21.468Z',
      updatedAt: '2025-02-16T10:34:12.932Z',
      deletedAt: '2025-11-12T13:40:43.790Z',
    },
  ],
};

// Table name to drizzle table mapping
const tables = {
  product: product,
  customer: customer,
  order: order,
  order_product: orderProduct,
  user: user,
  session: session,
  oauth_account: oauthAccount,
  profile: profile,
  posts: posts,
  user_type: userType,
  user_user_type: userUserType,
};

type TableName = keyof typeof tables;

// Convert ISO date strings to Date objects for Drizzle timestamp columns
function convertDates<T extends Record<string, unknown>>(row: T): T {
  const result = { ...row };
  for (const [key, value] of Object.entries(result)) {
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      (result as Record<string, unknown>)[key] = new Date(value);
    }
  }
  return result;
}

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    for (const [tableName, rows] of Object.entries(seedData)) {
      if (!(tableName in tables)) continue;
      const table = tables[tableName as TableName];

      console.log(`  Seeding ${tableName}...`);
      for (const row of rows) {
        await db.insert(table).values(convertDates(row));
      }
      console.log(`    ✅ Inserted ${rows.length} records`);
    }

    // Reset all PostgreSQL sequences to their max values
    console.log('  Resetting sequences...');
    await db.execute(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT c.relname AS seq_name, t.relname AS table_name, a.attname AS column_name
          FROM pg_class c
          JOIN pg_depend d ON d.objid = c.oid
          JOIN pg_class t ON t.oid = d.refobjid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
          WHERE c.relkind = 'S'
        ) LOOP
          EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 0) + 1, false)',
            r.seq_name, r.column_name, r.table_name);
        END LOOP;
      END $$;
    `);

    console.log('✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
