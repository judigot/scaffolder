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
      productName: 'Pinkie',
    },
    {
      id: 2,
      productName: 'Charlie',
    },
    {
      id: 3,
      productName: 'Daniela',
    },
    {
      id: 4,
      productName: 'Aiden',
    },
    {
      id: 5,
      productName: 'Kayley',
    },
    {
      id: 6,
      productName: 'Kimberly',
    },
    {
      id: 7,
      productName: 'Elias',
    },
    {
      id: 8,
      productName: 'Alysha',
    },
    {
      id: 9,
      productName: 'Godfrey',
    },
    {
      id: 10,
      productName: 'Rodrigo',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Uriah',
    },
    {
      id: 2,
      name: 'Letha',
    },
    {
      id: 3,
      name: 'Ines',
    },
    {
      id: 4,
      name: 'Malachi',
    },
    {
      id: 5,
      name: 'Martin',
    },
    {
      id: 6,
      name: 'Lucius',
    },
    {
      id: 7,
      name: 'Laurel',
    },
    {
      id: 8,
      name: 'Jennie',
    },
    {
      id: 9,
      name: 'Antonietta',
    },
    {
      id: 10,
      name: 'Marcelino',
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
      email: 'gabrielle.krajcik@example.net',
      username: 'casimir27',
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
      email: 'camryn_jones@example.net',
      username: 'nicolas.kub66',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Donald',
      lastName: 'Monserrat',
      avatarUrl: 'aedificium',
      emailVerified: false,
      createdAt: '2025-08-22T16:03:41.468Z',
      updatedAt: '2025-08-21T17:58:44.531Z',
    },
    {
      id: 3,
      email: 'theresia.lakin33@example.com',
      username: 'hallie89',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Angus',
      lastName: 'Marc',
      avatarUrl: 'conforto',
      emailVerified: true,
      createdAt: '2025-10-10T05:53:22.783Z',
      updatedAt: '2025-05-08T23:47:29.332Z',
    },
    {
      id: 4,
      email: 'willard_maggio66@example.com',
      username: 'bell8',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Lulu',
      lastName: 'Gabrielle',
      avatarUrl: 'vitiosus',
      emailVerified: true,
      createdAt: '2025-04-21T05:35:42.969Z',
      updatedAt: '2025-09-30T18:36:29.676Z',
    },
    {
      id: 5,
      email: 'immanuel_kling54@example.com',
      username: 'sigmund_moen',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Lydia',
      lastName: 'Madelyn',
      avatarUrl: 'spectaculum',
      emailVerified: true,
      createdAt: '2025-05-03T10:38:15.741Z',
      updatedAt: '2026-01-20T21:43:32.529Z',
    },
    {
      id: 6,
      email: 'theresa15@example.com',
      username: 'betsy.kunde',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Daren',
      lastName: 'Corbin',
      avatarUrl: 'acquiro',
      emailVerified: false,
      createdAt: '2025-04-16T02:04:10.307Z',
      updatedAt: '2025-07-27T06:17:32.364Z',
    },
    {
      id: 7,
      email: 'karolann_ullrich@example.com',
      username: 'oren_lubowitz96',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Rylee',
      lastName: 'Justice',
      avatarUrl: 'tabgo',
      emailVerified: false,
      createdAt: '2025-06-11T21:09:33.530Z',
      updatedAt: '2025-11-13T21:18:40.598Z',
    },
    {
      id: 8,
      email: 'natalie_feest79@example.com',
      username: 'darien_doyle10',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Ebony',
      lastName: 'Wilfrid',
      avatarUrl: 'bardus',
      emailVerified: false,
      createdAt: '2025-12-04T08:41:16.376Z',
      updatedAt: '2025-06-21T00:07:58.441Z',
    },
    {
      id: 9,
      email: 'seamus_mcdermott@example.org',
      username: 'serena80',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Clifford',
      lastName: 'Christa',
      avatarUrl: 'tumultus',
      emailVerified: false,
      createdAt: '2025-02-19T01:40:52.395Z',
      updatedAt: '2025-08-15T06:24:15.752Z',
    },
    {
      id: 10,
      email: 'thaddeus.tromp9@example.com',
      username: 'jayce92',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Jack',
      lastName: 'Derick',
      avatarUrl: 'virtus',
      emailVerified: false,
      createdAt: '2025-05-05T02:15:28.388Z',
      updatedAt: '2025-06-12T06:19:15.792Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-10-14T06:35:31.885Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2025-04-03T11:32:40.386Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2025-04-06T01:55:12.950Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2025-04-24T04:03:19.406Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-08-21T11:07:03.243Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2026-01-19T19:19:38.921Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2025-10-17T00:27:59.880Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2026-01-25T21:21:36.990Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-09-14T09:47:14.142Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-04-19T20:18:12.870Z',
    },
  ],
  oauth_account: [
    {
      providerId: 'ulterius',
      providerUserId: 'suscipit',
      userId: 1,
    },
    {
      providerId: 'pax',
      providerUserId: 'argentum',
      userId: 2,
    },
    {
      providerId: 'amitto',
      providerUserId: 'demergo',
      userId: 3,
    },
    {
      providerId: 'occaecati',
      providerUserId: 'uredo',
      userId: 4,
    },
    {
      providerId: 'thymbra',
      providerUserId: 'claustrum',
      userId: 5,
    },
    {
      providerId: 'ventus',
      providerUserId: 'optio',
      userId: 6,
    },
    {
      providerId: 'tepidus',
      providerUserId: 'crepusculum',
      userId: 7,
    },
    {
      providerId: 'amplexus',
      providerUserId: 'sequi',
      userId: 8,
    },
    {
      providerId: 'coaegresco',
      providerUserId: 'pariatur',
      userId: 9,
    },
    {
      providerId: 'certus',
      providerUserId: 'tunc',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'cohors',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'adeptio',
      createdAt: '2025-05-19T23:40:49.514Z',
      updatedAt: '2025-11-20T09:55:14.187Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'comedo',
      createdAt: '2025-07-24T12:25:20.652Z',
      updatedAt: '2025-02-26T12:35:26.640Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'vindico',
      createdAt: '2025-09-17T00:32:48.443Z',
      updatedAt: '2025-06-13T02:30:33.406Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'amplexus',
      createdAt: '2025-05-08T09:02:35.490Z',
      updatedAt: '2025-06-07T01:52:55.334Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'placeat',
      createdAt: '2025-06-06T19:44:31.740Z',
      updatedAt: '2025-02-17T12:05:36.873Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'curia',
      createdAt: '2025-04-14T01:33:23.742Z',
      updatedAt: '2025-06-28T12:03:19.711Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'non',
      createdAt: '2025-07-22T00:10:39.130Z',
      updatedAt: '2025-12-20T05:31:02.548Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'contigo',
      createdAt: '2025-07-08T17:52:15.762Z',
      updatedAt: '2025-08-03T14:42:42.804Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'nisi',
      createdAt: '2025-04-21T07:48:53.378Z',
      updatedAt: '2025-08-05T23:10:12.655Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'cogo',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'quisquam',
      content: 'cruciamentum',
      createdAt: '2025-08-11T20:58:47.980Z',
      updatedAt: '2025-02-09T22:01:46.322Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'acsi',
      content: 'derideo',
      createdAt: '2025-09-23T19:36:07.753Z',
      updatedAt: '2025-12-25T22:23:11.284Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'ullam',
      content: 'capillus',
      createdAt: '2025-12-15T04:39:47.561Z',
      updatedAt: '2025-12-20T16:02:33.693Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'corrupti',
      content: 'dens',
      createdAt: '2025-02-28T10:59:41.584Z',
      updatedAt: '2025-09-09T18:14:20.668Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'voro',
      content: 'somnus',
      createdAt: '2025-06-19T18:28:12.822Z',
      updatedAt: '2025-11-13T10:50:47.369Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'quas',
      content: 'denuo',
      createdAt: '2025-05-21T18:23:39.505Z',
      updatedAt: '2025-10-06T23:18:02.544Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'curiositas',
      content: 'adhaero',
      createdAt: '2025-09-10T12:03:37.720Z',
      updatedAt: '2025-05-13T01:28:13.801Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'claudeo',
      content: 'defessus',
      createdAt: '2025-07-12T17:32:54.492Z',
      updatedAt: '2025-12-10T00:04:07.357Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'acquiro',
      content: 'trans',
      createdAt: '2025-03-08T12:01:57.954Z',
      updatedAt: '2025-09-25T12:01:36.752Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Judah',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Corine',
      createdAt: '2025-09-14T00:51:34.712Z',
      updatedAt: '2025-05-07T02:49:41.917Z',
      deletedAt: '2025-09-21T05:00:33.763Z',
    },
    {
      id: 3,
      name: 'Angeline',
      createdAt: '2025-05-20T14:59:29.807Z',
      updatedAt: '2025-04-02T18:38:49.182Z',
      deletedAt: '2026-01-14T03:53:21.867Z',
    },
    {
      id: 4,
      name: 'Alek',
      createdAt: '2025-04-25T13:22:07.150Z',
      updatedAt: '2025-03-21T18:12:06.562Z',
      deletedAt: '2025-07-29T19:59:44.889Z',
    },
    {
      id: 5,
      name: 'Einar',
      createdAt: '2026-01-09T16:40:03.343Z',
      updatedAt: '2025-11-19T17:31:51.427Z',
      deletedAt: '2025-04-27T02:35:32.230Z',
    },
    {
      id: 6,
      name: 'Magnolia',
      createdAt: '2026-01-27T04:58:50.320Z',
      updatedAt: '2025-03-07T05:05:50.236Z',
      deletedAt: '2025-02-14T02:11:19.910Z',
    },
    {
      id: 7,
      name: 'Gideon',
      createdAt: '2025-10-08T09:07:57.934Z',
      updatedAt: '2025-06-21T00:55:42.608Z',
      deletedAt: '2025-06-23T00:28:25.647Z',
    },
    {
      id: 8,
      name: 'Nathaniel',
      createdAt: '2025-10-12T06:42:02.889Z',
      updatedAt: '2025-10-21T10:25:27.642Z',
      deletedAt: '2025-08-17T03:26:52.274Z',
    },
    {
      id: 9,
      name: 'Shanel',
      createdAt: '2025-12-06T14:47:11.288Z',
      updatedAt: '2025-06-14T01:21:36.620Z',
      deletedAt: '2025-11-15T19:54:38.405Z',
    },
    {
      id: 10,
      name: 'Akeem',
      createdAt: '2025-10-22T09:16:24.883Z',
      updatedAt: '2025-03-02T19:43:23.640Z',
      deletedAt: '2025-07-26T01:53:58.795Z',
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
      createdAt: '2025-05-14T20:34:04.716Z',
      updatedAt: '2025-03-23T08:52:10.544Z',
      deletedAt: '2025-05-28T14:18:24.670Z',
    },
    {
      userId: 3,
      userTypeId: 3,
      createdAt: '2025-11-27T06:33:15.531Z',
      updatedAt: '2025-04-17T05:11:19.195Z',
      deletedAt: '2025-06-21T16:45:46.219Z',
    },
    {
      userId: 4,
      userTypeId: 4,
      createdAt: '2025-08-25T17:35:06.454Z',
      updatedAt: '2025-03-18T10:02:29.448Z',
      deletedAt: '2025-11-22T23:03:16.330Z',
    },
    {
      userId: 5,
      userTypeId: 5,
      createdAt: '2025-08-02T14:35:44.709Z',
      updatedAt: '2025-06-03T04:54:14.732Z',
      deletedAt: '2025-06-04T00:30:31.716Z',
    },
    {
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-04-11T08:17:17.875Z',
      updatedAt: '2025-05-17T13:48:18.577Z',
      deletedAt: '2025-06-16T01:09:37.486Z',
    },
    {
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-10-19T18:05:41.416Z',
      updatedAt: '2025-02-24T11:25:32.612Z',
      deletedAt: '2025-07-22T15:35:05.272Z',
    },
    {
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-06-05T02:08:42.472Z',
      updatedAt: '2025-10-15T11:04:08.941Z',
      deletedAt: '2026-01-15T17:18:39.144Z',
    },
    {
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-05-05T17:51:11.952Z',
      updatedAt: '2026-02-03T21:36:18.199Z',
      deletedAt: '2025-11-29T18:43:20.930Z',
    },
    {
      userId: 10,
      userTypeId: 10,
      createdAt: '2025-12-01T23:26:47.788Z',
      updatedAt: '2025-09-12T22:36:31.105Z',
      deletedAt: '2025-04-03T21:38:40.947Z',
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
