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
      productName: 'Ara',
    },
    {
      id: 2,
      productName: 'Karianne',
    },
    {
      id: 3,
      productName: 'Houston',
    },
    {
      id: 4,
      productName: 'Keegan',
    },
    {
      id: 5,
      productName: 'Wendy',
    },
    {
      id: 6,
      productName: 'Heber',
    },
    {
      id: 7,
      productName: 'Ashtyn',
    },
    {
      id: 8,
      productName: 'Kaia',
    },
    {
      id: 9,
      productName: 'Ebba',
    },
    {
      id: 10,
      productName: 'Stevie',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Kris',
    },
    {
      id: 2,
      name: 'Arvilla',
    },
    {
      id: 3,
      name: 'Aileen',
    },
    {
      id: 4,
      name: 'Rene',
    },
    {
      id: 5,
      name: 'Lacey',
    },
    {
      id: 6,
      name: 'Michel',
    },
    {
      id: 7,
      name: 'Karli',
    },
    {
      id: 8,
      name: 'Madelynn',
    },
    {
      id: 9,
      name: 'Lavinia',
    },
    {
      id: 10,
      name: 'Jeramy',
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
      id: 1,
      orderId: 1,
      productId: 1,
    },
    {
      id: 2,
      orderId: 2,
      productId: 2,
    },
    {
      id: 3,
      orderId: 3,
      productId: 3,
    },
    {
      id: 4,
      orderId: 4,
      productId: 4,
    },
    {
      id: 5,
      orderId: 5,
      productId: 5,
    },
    {
      id: 6,
      orderId: 6,
      productId: 6,
    },
    {
      id: 7,
      orderId: 7,
      productId: 7,
    },
    {
      id: 8,
      orderId: 8,
      productId: 8,
    },
    {
      id: 9,
      orderId: 9,
      productId: 9,
    },
    {
      id: 10,
      orderId: 10,
      productId: 10,
    },
  ],
  user: [
    {
      id: 1,
      email: 'sarah_green65@example.com',
      username: 'abagail.rath',
      passwordHash: null,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      emailVerified: false,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      email: 'jacques_lind91@example.com',
      username: 'hillard40',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Aisha',
      lastName: 'Brendon',
      avatarUrl: 'adaugeo',
      emailVerified: false,
      createdAt: '2025-07-31T11:16:47.739Z',
      updatedAt: '2025-06-27T22:05:02.200Z',
    },
    {
      id: 3,
      email: 'rachael.murray92@example.com',
      username: 'scarlett.mckenzie61',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Pedro',
      lastName: 'Jerrold',
      avatarUrl: 'corroboro',
      emailVerified: false,
      createdAt: '2025-09-17T17:28:26.214Z',
      updatedAt: '2025-05-23T09:55:44.427Z',
    },
    {
      id: 4,
      email: 'letitia_altenwerth73@example.net',
      username: 'eliezer23',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Blanca',
      lastName: 'Davonte',
      avatarUrl: 'velociter',
      emailVerified: false,
      createdAt: '2025-10-14T21:46:56.178Z',
      updatedAt: '2025-02-25T06:51:45.345Z',
    },
    {
      id: 5,
      email: 'bailee.ebert42@example.net',
      username: 'maribel72',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Buddy',
      lastName: 'Carey',
      avatarUrl: 'admoveo',
      emailVerified: false,
      createdAt: '2025-10-01T01:39:23.589Z',
      updatedAt: '2025-11-10T23:22:27.253Z',
    },
    {
      id: 6,
      email: 'trystan_hickle97@example.net',
      username: 'garry.smith83',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Mohammad',
      lastName: 'Magnolia',
      avatarUrl: 'ager',
      emailVerified: false,
      createdAt: '2025-12-01T10:52:26.515Z',
      updatedAt: '2025-07-13T20:29:45.324Z',
    },
    {
      id: 7,
      email: 'johnnie.streich19@example.net',
      username: 'aglae80',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Bernie',
      lastName: 'Haylee',
      avatarUrl: 'architecto',
      emailVerified: false,
      createdAt: '2025-02-06T20:08:54.407Z',
      updatedAt: '2025-12-23T22:49:40.320Z',
    },
    {
      id: 8,
      email: 'eunice_swift90@example.net',
      username: 'ferne7',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Foster',
      lastName: 'Roy',
      avatarUrl: 'alveus',
      emailVerified: true,
      createdAt: '2025-09-24T18:12:02.863Z',
      updatedAt: '2025-06-09T03:27:33.648Z',
    },
    {
      id: 9,
      email: 'milton_ward24@example.net',
      username: 'jaida_considine0',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Andy',
      lastName: 'Kathryn',
      avatarUrl: 'sophismata',
      emailVerified: false,
      createdAt: '2025-06-01T02:28:54.279Z',
      updatedAt: '2025-10-23T07:50:23.637Z',
    },
    {
      id: 10,
      email: 'valentine78@example.com',
      username: 'luciano_veum',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Ned',
      lastName: 'Kaylin',
      avatarUrl: 'desidero',
      emailVerified: false,
      createdAt: '2025-08-14T07:07:03.706Z',
      updatedAt: '2025-08-26T01:51:00.703Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-12-26T00:35:16.830Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2026-01-23T06:32:47.191Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2025-08-14T06:38:33.922Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2025-04-08T01:50:03.151Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-03-26T23:21:46.535Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2025-03-27T15:54:39.887Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2025-10-18T04:36:23.238Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2025-10-03T21:52:31.555Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-09-08T19:49:38.400Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-04-12T10:13:27.221Z',
    },
  ],
  oauth_account: [
    {
      id: 1,
      providerId: 'sponte',
      providerUserId: 'demens',
      userId: 1,
    },
    {
      id: 2,
      providerId: 'temptatio',
      providerUserId: 'uxor',
      userId: 2,
    },
    {
      id: 3,
      providerId: 'suggero',
      providerUserId: 'statua',
      userId: 3,
    },
    {
      id: 4,
      providerId: 'vereor',
      providerUserId: 'aeneus',
      userId: 4,
    },
    {
      id: 5,
      providerId: 'averto',
      providerUserId: 'corrigo',
      userId: 5,
    },
    {
      id: 6,
      providerId: 'crapula',
      providerUserId: 'vacuus',
      userId: 6,
    },
    {
      id: 7,
      providerId: 'ago',
      providerUserId: 'sol',
      userId: 7,
    },
    {
      id: 8,
      providerId: 'comitatus',
      providerUserId: 'curvo',
      userId: 8,
    },
    {
      id: 9,
      providerId: 'cinis',
      providerUserId: 'fugiat',
      userId: 9,
    },
    {
      id: 10,
      providerId: 'rerum',
      providerUserId: 'sordeo',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'summa',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'apparatus',
      createdAt: '2025-11-26T14:02:26.785Z',
      updatedAt: '2025-05-10T19:49:31.610Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'tener',
      createdAt: '2025-10-30T09:10:22.578Z',
      updatedAt: '2025-07-01T17:30:15.519Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'voluptatum',
      createdAt: '2025-04-03T07:41:23.231Z',
      updatedAt: '2025-08-20T22:55:25.830Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'adflicto',
      createdAt: '2025-02-10T14:20:40.543Z',
      updatedAt: '2025-07-24T10:20:21.825Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'tenuis',
      createdAt: '2025-12-03T20:18:51.571Z',
      updatedAt: '2025-08-29T07:45:32.389Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'vulariter',
      createdAt: '2025-03-11T21:46:31.280Z',
      updatedAt: '2025-05-05T08:11:48.979Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'varietas',
      createdAt: '2025-07-26T21:53:47.661Z',
      updatedAt: '2026-01-03T18:27:51.539Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'pel',
      createdAt: '2025-10-19T13:10:32.262Z',
      updatedAt: '2025-04-05T02:32:02.290Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'exercitationem',
      createdAt: '2025-04-18T16:15:50.772Z',
      updatedAt: '2025-12-12T18:50:40.911Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'cetera',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'arbustum',
      content: 'vilitas',
      createdAt: '2025-12-16T21:28:22.370Z',
      updatedAt: '2025-07-14T18:50:00.755Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'veritatis',
      content: 'supra',
      createdAt: '2025-02-07T06:39:45.993Z',
      updatedAt: '2025-07-06T07:26:25.777Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'ager',
      content: 'cilicium',
      createdAt: '2025-09-03T09:25:45.513Z',
      updatedAt: '2025-12-15T20:25:04.734Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'abeo',
      content: 'aranea',
      createdAt: '2025-05-26T15:00:18.670Z',
      updatedAt: '2025-02-20T23:16:39.770Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'tergiversatio',
      content: 'abstergo',
      createdAt: '2025-02-15T15:14:14.786Z',
      updatedAt: '2025-06-15T14:20:17.309Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'ara',
      content: 'pecto',
      createdAt: '2025-11-06T06:04:46.637Z',
      updatedAt: '2025-07-11T19:57:20.900Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'condico',
      content: 'desipio',
      createdAt: '2025-07-27T03:20:39.311Z',
      updatedAt: '2025-06-21T18:30:56.607Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'sint',
      content: 'causa',
      createdAt: '2025-03-22T10:53:40.949Z',
      updatedAt: '2025-06-01T11:48:44.691Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'sumptus',
      content: 'victus',
      createdAt: '2025-02-13T04:56:33.379Z',
      updatedAt: '2025-12-20T15:28:34.940Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Yoshiko',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Lowell',
      createdAt: '2025-04-27T01:27:37.976Z',
      updatedAt: '2025-02-09T00:45:28.160Z',
      deletedAt: '2025-05-30T18:19:55.527Z',
    },
    {
      id: 3,
      name: 'Jimmie',
      createdAt: '2025-05-02T00:18:36.383Z',
      updatedAt: '2025-06-09T10:23:21.989Z',
      deletedAt: '2025-12-23T12:16:27.760Z',
    },
    {
      id: 4,
      name: 'Tania',
      createdAt: '2025-09-13T05:40:09.421Z',
      updatedAt: '2025-09-10T18:28:36.914Z',
      deletedAt: '2025-02-24T19:03:30.307Z',
    },
    {
      id: 5,
      name: 'Sydney',
      createdAt: '2025-07-21T09:32:16.151Z',
      updatedAt: '2025-02-26T05:28:37.569Z',
      deletedAt: '2026-01-03T19:49:44.676Z',
    },
    {
      id: 6,
      name: 'Kaleigh',
      createdAt: '2025-10-17T11:30:23.275Z',
      updatedAt: '2025-02-02T15:31:39.199Z',
      deletedAt: '2026-01-25T15:01:18.712Z',
    },
    {
      id: 7,
      name: 'Shane',
      createdAt: '2025-04-26T05:15:21.339Z',
      updatedAt: '2025-05-04T14:14:57.419Z',
      deletedAt: '2025-09-27T09:30:27.365Z',
    },
    {
      id: 8,
      name: 'Shanelle',
      createdAt: '2025-04-19T01:25:53.325Z',
      updatedAt: '2025-02-15T20:08:13.680Z',
      deletedAt: '2025-04-09T19:31:43.561Z',
    },
    {
      id: 9,
      name: 'Kari',
      createdAt: '2025-02-26T08:39:53.700Z',
      updatedAt: '2025-10-28T01:52:00.453Z',
      deletedAt: '2025-05-25T01:31:19.180Z',
    },
    {
      id: 10,
      name: 'Alexandra',
      createdAt: '2025-08-22T21:11:38.490Z',
      updatedAt: '2026-01-18T08:54:29.333Z',
      deletedAt: '2025-04-22T00:25:10.915Z',
    },
  ],
  user_user_type: [
    {
      id: 1,
      userId: 1,
      userTypeId: 1,
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      userId: 2,
      userTypeId: 2,
      createdAt: '2025-06-05T14:34:54.862Z',
      updatedAt: '2025-07-31T18:03:29.825Z',
      deletedAt: '2025-05-16T23:57:09.710Z',
    },
    {
      id: 3,
      userId: 3,
      userTypeId: 3,
      createdAt: '2026-01-13T16:38:49.210Z',
      updatedAt: '2025-08-31T03:06:50.125Z',
      deletedAt: '2026-01-23T21:04:23.600Z',
    },
    {
      id: 4,
      userId: 4,
      userTypeId: 4,
      createdAt: '2025-11-25T07:27:24.653Z',
      updatedAt: '2025-08-23T09:57:26.633Z',
      deletedAt: '2025-08-26T07:21:39.500Z',
    },
    {
      id: 5,
      userId: 5,
      userTypeId: 5,
      createdAt: '2025-07-30T06:19:08.221Z',
      updatedAt: '2025-06-07T20:45:05.943Z',
      deletedAt: '2025-02-02T18:24:35.435Z',
    },
    {
      id: 6,
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-06-09T04:54:34.374Z',
      updatedAt: '2025-02-09T22:42:59.472Z',
      deletedAt: '2025-10-15T01:20:43.496Z',
    },
    {
      id: 7,
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-12-20T00:09:24.412Z',
      updatedAt: '2025-05-26T20:32:18.572Z',
      deletedAt: '2025-06-21T11:56:41.999Z',
    },
    {
      id: 8,
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-05-15T02:51:33.414Z',
      updatedAt: '2025-09-17T17:21:33.646Z',
      deletedAt: '2026-01-31T18:36:49.868Z',
    },
    {
      id: 9,
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-02-09T22:42:40.915Z',
      updatedAt: '2025-05-26T20:41:39.439Z',
      deletedAt: '2025-03-25T02:56:24.813Z',
    },
    {
      id: 10,
      userId: 10,
      userTypeId: 10,
      createdAt: '2025-11-23T04:24:40.744Z',
      updatedAt: '2025-06-29T05:02:24.186Z',
      deletedAt: '2025-04-16T08:29:16.151Z',
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
