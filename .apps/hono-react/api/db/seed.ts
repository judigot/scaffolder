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
      productName: 'Cyril',
    },
    {
      id: 2,
      productName: 'Mckayla',
    },
    {
      id: 3,
      productName: 'Brenna',
    },
    {
      id: 4,
      productName: 'Ozella',
    },
    {
      id: 5,
      productName: 'Lorine',
    },
    {
      id: 6,
      productName: 'Aylin',
    },
    {
      id: 7,
      productName: 'Carolyne',
    },
    {
      id: 8,
      productName: 'Evan',
    },
    {
      id: 9,
      productName: 'Sandy',
    },
    {
      id: 10,
      productName: 'Laurel',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Remington',
    },
    {
      id: 2,
      name: 'Giles',
    },
    {
      id: 3,
      name: 'Gage',
    },
    {
      id: 4,
      name: 'Elenora',
    },
    {
      id: 5,
      name: 'Walker',
    },
    {
      id: 6,
      name: 'Ardella',
    },
    {
      id: 7,
      name: 'Marisol',
    },
    {
      id: 8,
      name: 'Roscoe',
    },
    {
      id: 9,
      name: 'Owen',
    },
    {
      id: 10,
      name: 'Eugene',
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
      email: 'rico_stiedemann@example.com',
      username: 'samson12',
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
      email: 'adrien11@example.net',
      username: 'moises_stroman74',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Stefan',
      lastName: 'Leonie',
      avatarUrl: 'verecundia',
      emailVerified: false,
      createdAt: '2025-08-21T03:31:09.358Z',
      updatedAt: '2025-12-18T11:24:41.270Z',
    },
    {
      id: 3,
      email: 'gunner.lehner85@example.com',
      username: 'marjory90',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Ebony',
      lastName: 'Lucas',
      avatarUrl: 'solutio',
      emailVerified: false,
      createdAt: '2025-04-08T00:11:19.306Z',
      updatedAt: '2025-12-28T12:49:26.355Z',
    },
    {
      id: 4,
      email: 'hazel.prohaska70@example.com',
      username: 'david.spencer',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Brenda',
      lastName: 'Lucas',
      avatarUrl: 'confugo',
      emailVerified: true,
      createdAt: '2025-11-25T22:31:01.149Z',
      updatedAt: '2025-10-06T21:02:37.262Z',
    },
    {
      id: 5,
      email: 'ewell6@example.org',
      username: 'osbaldo_runolfsson',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Keenan',
      lastName: 'Ahmed',
      avatarUrl: 'adduco',
      emailVerified: true,
      createdAt: '2025-10-15T19:19:33.330Z',
      updatedAt: '2025-05-05T03:36:23.674Z',
    },
    {
      id: 6,
      email: 'keith_kulas@example.org',
      username: 'parker.legros23',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Leonel',
      lastName: 'Annamarie',
      avatarUrl: 'reprehenderit',
      emailVerified: true,
      createdAt: '2025-08-16T20:19:40.473Z',
      updatedAt: '2025-05-25T13:30:21.414Z',
    },
    {
      id: 7,
      email: 'stan42@example.net',
      username: 'eloy_quigley',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Rhoda',
      lastName: 'Vito',
      avatarUrl: 'terebro',
      emailVerified: false,
      createdAt: '2025-12-08T08:32:13.640Z',
      updatedAt: '2025-07-17T01:33:18.652Z',
    },
    {
      id: 8,
      email: 'eva_toy@example.org',
      username: 'wiley15',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Donald',
      lastName: 'Monty',
      avatarUrl: 'certe',
      emailVerified: false,
      createdAt: '2025-06-05T09:09:25.194Z',
      updatedAt: '2025-08-16T04:27:52.871Z',
    },
    {
      id: 9,
      email: 'elinore_runte92@example.org',
      username: 'murray.champlin56',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Ernie',
      lastName: 'Zella',
      avatarUrl: 'reprehenderit',
      emailVerified: false,
      createdAt: '2025-12-30T07:24:22.681Z',
      updatedAt: '2025-05-23T06:42:58.630Z',
    },
    {
      id: 10,
      email: 'christina.conroy@example.net',
      username: 'theresa13',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Tavares',
      lastName: 'Palma',
      avatarUrl: 'solitudo',
      emailVerified: true,
      createdAt: '2025-04-25T23:05:56.270Z',
      updatedAt: '2025-12-25T05:46:22.792Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-11-01T14:56:21.715Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2025-03-25T07:36:01.977Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2026-01-25T15:13:06.723Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2025-05-29T08:42:00.358Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-03-27T23:10:55.775Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2025-06-14T06:28:21.680Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2026-01-29T22:47:51.826Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2025-04-17T09:02:59.827Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-02-03T03:01:11.950Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-02-07T17:41:37.793Z',
    },
  ],
  oauth_account: [
    {
      id: 1,
      providerId: 'eius',
      providerUserId: 'coadunatio',
      userId: 1,
    },
    {
      id: 2,
      providerId: 'solitudo',
      providerUserId: 'temeritas',
      userId: 2,
    },
    {
      id: 3,
      providerId: 'sopor',
      providerUserId: 'defetiscor',
      userId: 3,
    },
    {
      id: 4,
      providerId: 'admoneo',
      providerUserId: 'cohors',
      userId: 4,
    },
    {
      id: 5,
      providerId: 'considero',
      providerUserId: 'curriculum',
      userId: 5,
    },
    {
      id: 6,
      providerId: 'aro',
      providerUserId: 'cotidie',
      userId: 6,
    },
    {
      id: 7,
      providerId: 'talio',
      providerUserId: 'tandem',
      userId: 7,
    },
    {
      id: 8,
      providerId: 'adulatio',
      providerUserId: 'adiuvo',
      userId: 8,
    },
    {
      id: 9,
      providerId: 'curvo',
      providerUserId: 'stipes',
      userId: 9,
    },
    {
      id: 10,
      providerId: 'verbera',
      providerUserId: 'quis',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'fuga',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'volo',
      createdAt: '2025-10-10T04:42:52.139Z',
      updatedAt: '2025-03-17T11:27:20.467Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'demitto',
      createdAt: '2025-02-20T04:39:00.760Z',
      updatedAt: '2025-05-03T01:17:55.302Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'beneficium',
      createdAt: '2025-11-16T21:00:55.182Z',
      updatedAt: '2025-12-22T04:18:46.532Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'subvenio',
      createdAt: '2025-06-29T07:51:43.721Z',
      updatedAt: '2025-07-18T15:06:01.284Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'urbs',
      createdAt: '2025-11-29T23:23:21.452Z',
      updatedAt: '2025-09-06T18:38:55.813Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'consequatur',
      createdAt: '2025-02-11T10:07:09.351Z',
      updatedAt: '2025-06-22T23:15:08.886Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'audio',
      createdAt: '2025-09-25T04:05:11.750Z',
      updatedAt: '2025-02-19T11:43:25.730Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'angulus',
      createdAt: '2026-02-02T02:16:49.100Z',
      updatedAt: '2025-03-16T12:09:17.620Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'bonus',
      createdAt: '2026-01-02T08:45:17.510Z',
      updatedAt: '2025-12-19T06:57:12.768Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'acidus',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'cribro',
      content: 'voluptatibus',
      createdAt: '2025-06-06T11:45:36.275Z',
      updatedAt: '2025-10-04T09:39:49.937Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'cenaculum',
      content: 'maiores',
      createdAt: '2025-08-10T01:55:33.152Z',
      updatedAt: '2025-03-24T18:17:17.560Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'et',
      content: 'sono',
      createdAt: '2025-07-01T15:45:02.406Z',
      updatedAt: '2025-03-10T12:21:28.174Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'canto',
      content: 'adhaero',
      createdAt: '2025-06-27T10:18:00.163Z',
      updatedAt: '2025-06-01T20:01:53.777Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'depraedor',
      content: 'vinco',
      createdAt: '2025-12-18T02:51:49.542Z',
      updatedAt: '2025-07-01T14:08:30.793Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'enim',
      content: 'cur',
      createdAt: '2025-09-17T12:24:20.458Z',
      updatedAt: '2025-05-02T14:48:34.506Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'tremo',
      content: 'substantia',
      createdAt: '2025-06-16T12:39:08.833Z',
      updatedAt: '2025-12-31T15:43:50.286Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'arceo',
      content: 'desino',
      createdAt: '2025-07-13T14:13:03.609Z',
      updatedAt: '2025-11-03T14:48:39.389Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'degusto',
      content: 'adflicto',
      createdAt: '2025-06-14T19:02:29.652Z',
      updatedAt: '2025-10-13T06:17:56.249Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Charlotte',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Lelah',
      createdAt: '2025-10-02T04:41:57.668Z',
      updatedAt: '2025-05-08T15:19:51.906Z',
      deletedAt: '2025-03-07T06:21:14.937Z',
    },
    {
      id: 3,
      name: 'Jacklyn',
      createdAt: '2025-12-13T23:06:44.000Z',
      updatedAt: '2025-04-03T01:09:34.716Z',
      deletedAt: '2026-02-02T06:01:05.866Z',
    },
    {
      id: 4,
      name: 'Kaylee',
      createdAt: '2025-02-28T02:31:01.761Z',
      updatedAt: '2025-07-12T22:50:01.713Z',
      deletedAt: '2025-08-13T06:22:55.341Z',
    },
    {
      id: 5,
      name: 'Rolando',
      createdAt: '2025-10-29T06:12:31.224Z',
      updatedAt: '2025-03-08T11:05:30.856Z',
      deletedAt: '2025-09-15T19:28:33.780Z',
    },
    {
      id: 6,
      name: 'Werner',
      createdAt: '2025-10-29T13:30:56.854Z',
      updatedAt: '2026-01-17T03:21:22.715Z',
      deletedAt: '2025-12-15T09:08:09.683Z',
    },
    {
      id: 7,
      name: 'Jamel',
      createdAt: '2025-05-15T12:38:14.292Z',
      updatedAt: '2025-12-11T07:42:49.272Z',
      deletedAt: '2026-01-25T19:40:48.382Z',
    },
    {
      id: 8,
      name: 'Olga',
      createdAt: '2026-01-29T02:07:00.626Z',
      updatedAt: '2026-01-02T11:56:02.389Z',
      deletedAt: '2025-06-22T22:29:40.256Z',
    },
    {
      id: 9,
      name: 'Orlo',
      createdAt: '2025-09-17T17:55:55.613Z',
      updatedAt: '2026-01-27T17:30:34.831Z',
      deletedAt: '2025-04-16T06:33:01.567Z',
    },
    {
      id: 10,
      name: 'Salvatore',
      createdAt: '2025-11-01T16:00:32.801Z',
      updatedAt: '2025-03-03T00:06:21.476Z',
      deletedAt: '2025-08-10T16:44:56.124Z',
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
      createdAt: '2025-11-04T04:18:37.618Z',
      updatedAt: '2026-01-04T18:06:38.756Z',
      deletedAt: '2025-04-17T10:19:39.958Z',
    },
    {
      id: 3,
      userId: 3,
      userTypeId: 3,
      createdAt: '2025-10-19T06:52:59.462Z',
      updatedAt: '2025-04-08T15:34:49.568Z',
      deletedAt: '2025-04-22T08:29:56.692Z',
    },
    {
      id: 4,
      userId: 4,
      userTypeId: 4,
      createdAt: '2025-02-13T08:03:11.867Z',
      updatedAt: '2025-09-21T22:51:48.225Z',
      deletedAt: '2025-09-06T00:26:37.438Z',
    },
    {
      id: 5,
      userId: 5,
      userTypeId: 5,
      createdAt: '2025-05-13T12:16:54.880Z',
      updatedAt: '2025-08-11T06:37:27.230Z',
      deletedAt: '2025-12-03T05:29:43.632Z',
    },
    {
      id: 6,
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-11-23T18:45:53.199Z',
      updatedAt: '2025-03-27T15:36:24.926Z',
      deletedAt: '2025-04-04T14:01:46.938Z',
    },
    {
      id: 7,
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-04-15T00:00:00.294Z',
      updatedAt: '2025-09-17T16:31:51.956Z',
      deletedAt: '2025-07-04T22:53:36.783Z',
    },
    {
      id: 8,
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-10-05T19:15:19.721Z',
      updatedAt: '2025-11-06T11:17:42.133Z',
      deletedAt: '2025-11-15T08:42:44.791Z',
    },
    {
      id: 9,
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-10-30T19:33:21.170Z',
      updatedAt: '2025-06-25T15:51:19.583Z',
      deletedAt: '2025-09-08T05:07:22.162Z',
    },
    {
      id: 10,
      userId: 10,
      userTypeId: 10,
      createdAt: '2025-11-25T05:40:11.430Z',
      updatedAt: '2025-03-06T04:40:03.555Z',
      deletedAt: '2025-06-29T08:03:35.720Z',
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
