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
      productName: 'Jannie',
    },
    {
      id: 2,
      productName: 'Will',
    },
    {
      id: 3,
      productName: 'Cornell',
    },
    {
      id: 4,
      productName: 'Sidney',
    },
    {
      id: 5,
      productName: 'Susan',
    },
    {
      id: 6,
      productName: 'Adriana',
    },
    {
      id: 7,
      productName: 'Frederique',
    },
    {
      id: 8,
      productName: 'Devante',
    },
    {
      id: 9,
      productName: 'Verner',
    },
    {
      id: 10,
      productName: 'Mylene',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Leilani',
    },
    {
      id: 2,
      name: 'Margaret',
    },
    {
      id: 3,
      name: 'Kenny',
    },
    {
      id: 4,
      name: 'Akeem',
    },
    {
      id: 5,
      name: 'Casimir',
    },
    {
      id: 6,
      name: 'Aron',
    },
    {
      id: 7,
      name: 'Shanny',
    },
    {
      id: 8,
      name: 'Esta',
    },
    {
      id: 9,
      name: 'Dustin',
    },
    {
      id: 10,
      name: 'Richard',
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
      email: 'hailee_schroeder@example.com',
      username: 'deangelo_pfannerstill64',
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
      email: 'raina19@example.net',
      username: 'evalyn_johns27',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Denis',
      lastName: 'Nat',
      avatarUrl: 'maxime',
      emailVerified: false,
      createdAt: '2025-04-02T18:08:07.454Z',
      updatedAt: '2025-12-10T05:50:17.400Z',
    },
    {
      id: 3,
      email: 'samanta_robel73@example.com',
      username: 'scarlett_cummerata',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Isom',
      lastName: 'Gabriella',
      avatarUrl: 'tabernus',
      emailVerified: true,
      createdAt: '2025-07-07T17:01:32.980Z',
      updatedAt: '2025-07-04T13:35:39.198Z',
    },
    {
      id: 4,
      email: 'natasha_waelchi@example.org',
      username: 'sterling56',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Arjun',
      lastName: 'Albin',
      avatarUrl: 'cado',
      emailVerified: true,
      createdAt: '2025-03-11T21:20:40.428Z',
      updatedAt: '2026-01-13T17:54:52.375Z',
    },
    {
      id: 5,
      email: 'ed7@example.com',
      username: 'lia_mayert8',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Betsy',
      lastName: 'Bartholome',
      avatarUrl: 'vel',
      emailVerified: true,
      createdAt: '2025-07-15T16:13:19.359Z',
      updatedAt: '2025-09-28T04:02:24.136Z',
    },
    {
      id: 6,
      email: 'brando_cormier@example.org',
      username: 'juliana97',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Johnathon',
      lastName: 'Griffin',
      avatarUrl: 'contra',
      emailVerified: true,
      createdAt: '2025-08-14T22:12:04.841Z',
      updatedAt: '2025-05-10T10:22:05.212Z',
    },
    {
      id: 7,
      email: 'ava68@example.com',
      username: 'justyn22',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Millie',
      lastName: 'Gracie',
      avatarUrl: 'certe',
      emailVerified: true,
      createdAt: '2025-08-21T07:24:01.885Z',
      updatedAt: '2025-11-16T20:08:22.724Z',
    },
    {
      id: 8,
      email: 'mabelle30@example.net',
      username: 'maximillian_king95',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Annabel',
      lastName: 'America',
      avatarUrl: 'vitae',
      emailVerified: false,
      createdAt: '2025-12-28T17:56:13.134Z',
      updatedAt: '2026-01-06T15:35:03.657Z',
    },
    {
      id: 9,
      email: 'shanel8@example.com',
      username: 'demond46',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Kristy',
      lastName: 'Deonte',
      avatarUrl: 'sunt',
      emailVerified: false,
      createdAt: '2025-02-21T00:49:03.681Z',
      updatedAt: '2025-05-31T01:50:46.211Z',
    },
    {
      id: 10,
      email: 'quinten97@example.com',
      username: 'tremayne_sawayn14',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Raheem',
      lastName: 'Gerhard',
      avatarUrl: 'vapulus',
      emailVerified: false,
      createdAt: '2025-10-11T06:11:58.769Z',
      updatedAt: '2025-06-03T00:24:53.248Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-02-08T01:18:47.733Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2025-02-03T22:54:28.976Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2025-08-24T08:40:27.806Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2025-07-25T09:55:41.297Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-12-17T06:07:24.580Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2025-04-20T22:13:05.198Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2025-09-01T13:28:11.426Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2026-01-08T03:46:04.832Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-07-02T12:06:51.841Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-06-29T05:11:31.795Z',
    },
  ],
  oauth_account: [
    {
      providerId: 'bos',
      providerUserId: 'adduco',
      userId: 1,
    },
    {
      providerId: 'decet',
      providerUserId: 'calamitas',
      userId: 2,
    },
    {
      providerId: 'conqueror',
      providerUserId: 'decretum',
      userId: 3,
    },
    {
      providerId: 'stips',
      providerUserId: 'coniuratio',
      userId: 4,
    },
    {
      providerId: 'itaque',
      providerUserId: 'curis',
      userId: 5,
    },
    {
      providerId: 'arca',
      providerUserId: 'porro',
      userId: 6,
    },
    {
      providerId: 'acies',
      providerUserId: 'ascit',
      userId: 7,
    },
    {
      providerId: 'suadeo',
      providerUserId: 'adsum',
      userId: 8,
    },
    {
      providerId: 'sursum',
      providerUserId: 'vociferor',
      userId: 9,
    },
    {
      providerId: 'dignissimos',
      providerUserId: 'terror',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'totus',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'tripudio',
      createdAt: '2025-08-21T20:39:46.362Z',
      updatedAt: '2026-01-04T00:51:51.485Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'canto',
      createdAt: '2025-05-09T17:54:58.560Z',
      updatedAt: '2025-09-07T19:24:09.713Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'vespillo',
      createdAt: '2025-03-29T09:25:57.876Z',
      updatedAt: '2025-07-13T07:07:55.344Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'concedo',
      createdAt: '2025-07-08T17:10:28.844Z',
      updatedAt: '2025-05-01T02:35:54.656Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'triduana',
      createdAt: '2025-08-19T01:27:31.623Z',
      updatedAt: '2025-09-05T10:26:40.569Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'vado',
      createdAt: '2025-06-15T14:58:57.986Z',
      updatedAt: '2025-05-26T10:53:59.619Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'curso',
      createdAt: '2025-02-15T06:01:51.964Z',
      updatedAt: '2025-10-13T14:03:46.220Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'urbanus',
      createdAt: '2025-11-08T11:48:15.888Z',
      updatedAt: '2025-12-16T03:05:16.902Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'pectus',
      createdAt: '2025-12-28T06:37:55.531Z',
      updatedAt: '2025-08-29T10:22:35.403Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'creator',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'caecus',
      content: 'crinis',
      createdAt: '2025-09-06T07:46:44.646Z',
      updatedAt: '2025-12-24T18:37:08.303Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'vorax',
      content: 'defessus',
      createdAt: '2025-09-24T06:09:42.886Z',
      updatedAt: '2025-03-17T23:26:25.921Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'cupiditas',
      content: 'nobis',
      createdAt: '2025-09-16T11:43:57.313Z',
      updatedAt: '2025-08-27T23:05:50.700Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'apostolus',
      content: 'trans',
      createdAt: '2025-07-01T12:13:57.371Z',
      updatedAt: '2025-09-15T12:49:33.180Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'color',
      content: 'astrum',
      createdAt: '2025-03-03T17:13:43.697Z',
      updatedAt: '2025-08-16T21:11:22.837Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'barba',
      content: 'collum',
      createdAt: '2025-08-09T03:59:55.212Z',
      updatedAt: '2025-07-20T12:06:21.713Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'arbor',
      content: 'argentum',
      createdAt: '2025-09-21T21:24:30.121Z',
      updatedAt: '2025-06-22T06:52:11.430Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'congregatio',
      content: 'careo',
      createdAt: '2025-12-06T09:38:48.326Z',
      updatedAt: '2025-10-28T02:30:19.426Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'cresco',
      content: 'adsidue',
      createdAt: '2025-07-03T22:35:36.810Z',
      updatedAt: '2025-12-03T12:56:54.274Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Isabell',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Stephania',
      createdAt: '2025-05-24T00:45:15.128Z',
      updatedAt: '2025-04-27T00:53:00.300Z',
      deletedAt: '2025-06-02T05:32:17.311Z',
    },
    {
      id: 3,
      name: 'Jaylan',
      createdAt: '2025-07-11T11:18:55.327Z',
      updatedAt: '2025-11-05T23:38:56.962Z',
      deletedAt: '2025-08-24T02:30:02.550Z',
    },
    {
      id: 4,
      name: 'Tara',
      createdAt: '2025-07-20T21:26:45.662Z',
      updatedAt: '2025-05-30T16:05:29.165Z',
      deletedAt: '2025-03-16T05:33:28.653Z',
    },
    {
      id: 5,
      name: 'Janessa',
      createdAt: '2025-10-30T03:59:06.528Z',
      updatedAt: '2026-01-14T17:51:31.927Z',
      deletedAt: '2026-02-01T15:57:13.311Z',
    },
    {
      id: 6,
      name: 'Libby',
      createdAt: '2025-02-20T02:08:39.644Z',
      updatedAt: '2025-10-14T00:37:02.990Z',
      deletedAt: '2025-03-18T07:56:30.210Z',
    },
    {
      id: 7,
      name: 'Rod',
      createdAt: '2025-10-09T03:20:48.870Z',
      updatedAt: '2025-06-12T17:08:58.580Z',
      deletedAt: '2025-12-30T04:54:04.709Z',
    },
    {
      id: 8,
      name: 'Marge',
      createdAt: '2025-05-02T03:19:19.950Z',
      updatedAt: '2025-07-08T03:21:05.720Z',
      deletedAt: '2026-01-30T00:46:12.140Z',
    },
    {
      id: 9,
      name: 'Immanuel',
      createdAt: '2025-10-25T19:09:41.168Z',
      updatedAt: '2025-06-08T16:27:58.630Z',
      deletedAt: '2025-12-23T17:44:16.695Z',
    },
    {
      id: 10,
      name: 'Camden',
      createdAt: '2025-09-19T19:36:25.645Z',
      updatedAt: '2025-05-06T08:38:51.349Z',
      deletedAt: '2025-03-10T07:23:52.615Z',
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
      createdAt: '2025-08-16T08:14:22.279Z',
      updatedAt: '2025-03-28T00:35:41.337Z',
      deletedAt: '2025-06-16T19:58:23.109Z',
    },
    {
      userId: 3,
      userTypeId: 3,
      createdAt: '2025-08-26T17:12:18.324Z',
      updatedAt: '2025-02-16T00:30:08.789Z',
      deletedAt: '2025-05-26T15:04:57.957Z',
    },
    {
      userId: 4,
      userTypeId: 4,
      createdAt: '2025-04-05T04:58:05.393Z',
      updatedAt: '2025-12-29T18:13:33.217Z',
      deletedAt: '2025-04-18T10:33:23.674Z',
    },
    {
      userId: 5,
      userTypeId: 5,
      createdAt: '2025-03-15T09:33:03.292Z',
      updatedAt: '2025-02-12T17:01:01.694Z',
      deletedAt: '2025-07-10T22:22:13.342Z',
    },
    {
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-09-26T04:47:01.776Z',
      updatedAt: '2025-08-07T09:25:35.520Z',
      deletedAt: '2025-11-19T13:35:07.526Z',
    },
    {
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-12-13T18:36:17.388Z',
      updatedAt: '2025-08-12T11:25:34.282Z',
      deletedAt: '2025-09-01T03:51:44.143Z',
    },
    {
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-07-18T06:34:40.324Z',
      updatedAt: '2025-04-02T11:02:12.814Z',
      deletedAt: '2025-09-23T20:54:01.700Z',
    },
    {
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-07-06T03:51:51.962Z',
      updatedAt: '2025-11-01T11:24:48.757Z',
      deletedAt: '2025-08-02T20:36:30.274Z',
    },
    {
      userId: 10,
      userTypeId: 10,
      createdAt: '2026-01-13T01:47:26.390Z',
      updatedAt: '2025-08-17T15:04:37.807Z',
      deletedAt: '2025-07-21T19:22:20.483Z',
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
