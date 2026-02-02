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
      productName: 'Adelle',
    },
    {
      id: 2,
      productName: 'Frederic',
    },
    {
      id: 3,
      productName: 'Dorothy',
    },
    {
      id: 4,
      productName: 'Karli',
    },
    {
      id: 5,
      productName: 'Vincent',
    },
    {
      id: 6,
      productName: 'Maiya',
    },
    {
      id: 7,
      productName: 'Judd',
    },
    {
      id: 8,
      productName: 'Reanna',
    },
    {
      id: 9,
      productName: 'Trever',
    },
    {
      id: 10,
      productName: 'Judy',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Dandre',
    },
    {
      id: 2,
      name: 'Enrique',
    },
    {
      id: 3,
      name: 'Bernhard',
    },
    {
      id: 4,
      name: 'Oda',
    },
    {
      id: 5,
      name: 'Prudence',
    },
    {
      id: 6,
      name: 'Ayden',
    },
    {
      id: 7,
      name: 'Edwardo',
    },
    {
      id: 8,
      name: 'Alia',
    },
    {
      id: 9,
      name: 'Edd',
    },
    {
      id: 10,
      name: 'Hadley',
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
      email: 'leonora.goodwin@example.org',
      username: 'moriah4',
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
      email: 'bradly.labadie55@example.net',
      username: 'jennie.schuppe',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Aniyah',
      lastName: 'Therese',
      avatarUrl: 'succedo',
      emailVerified: false,
      createdAt: '2025-06-22T15:33:40.550Z',
      updatedAt: '2025-04-18T15:45:28.246Z',
    },
    {
      id: 3,
      email: 'jazmyn73@example.com',
      username: 'ethan.willms',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Lee',
      lastName: 'Jarrod',
      avatarUrl: 'vesco',
      emailVerified: false,
      createdAt: '2025-08-11T14:46:33.507Z',
      updatedAt: '2025-12-12T15:47:08.160Z',
    },
    {
      id: 4,
      email: 'lola67@example.com',
      username: 'adaline_miller98',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Emely',
      lastName: 'Carmelo',
      avatarUrl: 'desolo',
      emailVerified: true,
      createdAt: '2025-10-18T23:19:03.843Z',
      updatedAt: '2025-04-01T08:28:37.204Z',
    },
    {
      id: 5,
      email: 'loraine11@example.org',
      username: 'charley23',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Hettie',
      lastName: 'Magdalena',
      avatarUrl: 'ascit',
      emailVerified: true,
      createdAt: '2025-11-06T07:35:47.732Z',
      updatedAt: '2025-09-23T22:25:27.883Z',
    },
    {
      id: 6,
      email: 'elinore18@example.net',
      username: 'leann73',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Golda',
      lastName: 'Crystel',
      avatarUrl: 'animus',
      emailVerified: true,
      createdAt: '2025-10-25T10:07:23.136Z',
      updatedAt: '2025-07-28T22:21:58.344Z',
    },
    {
      id: 7,
      email: 'franco.becker@example.org',
      username: 'keith90',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Elinore',
      lastName: 'Noel',
      avatarUrl: 'videlicet',
      emailVerified: true,
      createdAt: '2025-09-30T16:05:43.770Z',
      updatedAt: '2025-10-04T02:18:37.549Z',
    },
    {
      id: 8,
      email: 'lynn_farrell26@example.org',
      username: 'sofia90',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Dax',
      lastName: 'Edgar',
      avatarUrl: 'carbo',
      emailVerified: true,
      createdAt: '2025-10-28T05:21:04.338Z',
      updatedAt: '2025-10-27T17:15:27.900Z',
    },
    {
      id: 9,
      email: 'gabrielle.ankunding80@example.com',
      username: 'joseph_corkery',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Emelie',
      lastName: 'Nicklaus',
      avatarUrl: 'totidem',
      emailVerified: false,
      createdAt: '2025-03-20T18:50:21.610Z',
      updatedAt: '2025-07-03T01:28:46.117Z',
    },
    {
      id: 10,
      email: 'oscar.mcclure@example.com',
      username: 'ladarius29',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Maverick',
      lastName: 'Douglas',
      avatarUrl: 'corroboro',
      emailVerified: false,
      createdAt: '2025-05-05T08:26:15.644Z',
      updatedAt: '2026-01-18T04:43:37.896Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-06-18T13:55:06.455Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2025-05-13T09:47:27.648Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2025-11-18T00:19:10.440Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2026-01-31T04:57:28.737Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-11-27T12:31:48.405Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2025-02-16T16:55:54.684Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2025-10-25T11:05:00.502Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2025-07-22T08:31:18.549Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-02-13T20:46:02.587Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-10-04T12:36:28.501Z',
    },
  ],
  oauth_account: [
    {
      id: 1,
      providerId: 'culpa',
      providerUserId: 'utilis',
      userId: 1,
    },
    {
      id: 2,
      providerId: 'tonsor',
      providerUserId: 'a',
      userId: 2,
    },
    {
      id: 3,
      providerId: 'repellendus',
      providerUserId: 'vigor',
      userId: 3,
    },
    {
      id: 4,
      providerId: 'textor',
      providerUserId: 'tenus',
      userId: 4,
    },
    {
      id: 5,
      providerId: 'tolero',
      providerUserId: 'thymbra',
      userId: 5,
    },
    {
      id: 6,
      providerId: 'viduo',
      providerUserId: 'patria',
      userId: 6,
    },
    {
      id: 7,
      providerId: 'caelum',
      providerUserId: 'crepusculum',
      userId: 7,
    },
    {
      id: 8,
      providerId: 'cresco',
      providerUserId: 'artificiose',
      userId: 8,
    },
    {
      id: 9,
      providerId: 'volo',
      providerUserId: 'libero',
      userId: 9,
    },
    {
      id: 10,
      providerId: 'valens',
      providerUserId: 'supplanto',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'quos',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'adipiscor',
      createdAt: '2025-07-06T09:01:03.513Z',
      updatedAt: '2025-03-01T17:37:36.790Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'celer',
      createdAt: '2025-08-07T08:25:51.620Z',
      updatedAt: '2025-10-23T13:55:27.613Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'viduo',
      createdAt: '2025-05-13T07:12:26.974Z',
      updatedAt: '2025-10-05T05:35:48.245Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'volo',
      createdAt: '2025-06-15T21:43:08.519Z',
      updatedAt: '2026-01-28T04:31:26.649Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'vacuus',
      createdAt: '2025-10-27T07:07:08.938Z',
      updatedAt: '2025-09-27T11:22:37.564Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'alveus',
      createdAt: '2025-02-14T10:43:25.167Z',
      updatedAt: '2025-06-22T02:30:05.116Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'tunc',
      createdAt: '2025-05-24T01:35:03.892Z',
      updatedAt: '2025-05-15T10:02:23.626Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'damno',
      createdAt: '2025-05-11T02:01:13.921Z',
      updatedAt: '2025-09-22T10:59:00.377Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'beatae',
      createdAt: '2025-08-29T10:39:25.690Z',
      updatedAt: '2025-05-17T00:21:55.193Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'delectus',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'suasoria',
      content: 'versus',
      createdAt: '2026-01-19T05:25:15.787Z',
      updatedAt: '2026-01-15T18:12:06.596Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'testimonium',
      content: 'concido',
      createdAt: '2025-06-04T03:45:13.000Z',
      updatedAt: '2025-04-20T02:33:29.651Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'degusto',
      content: 'recusandae',
      createdAt: '2025-03-15T04:18:07.449Z',
      updatedAt: '2025-05-08T00:16:43.648Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'cursus',
      content: 'repudiandae',
      createdAt: '2025-03-06T06:00:30.788Z',
      updatedAt: '2025-12-10T11:02:38.767Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'voluptas',
      content: 'exercitationem',
      createdAt: '2025-09-22T01:41:30.175Z',
      updatedAt: '2025-12-04T08:48:28.711Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'vaco',
      content: 'demonstro',
      createdAt: '2026-01-05T13:50:53.783Z',
      updatedAt: '2025-12-02T08:56:11.885Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'voro',
      content: 'utpote',
      createdAt: '2025-03-20T14:13:21.190Z',
      updatedAt: '2025-02-06T05:26:32.758Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'aranea',
      content: 'basium',
      createdAt: '2025-05-08T10:17:17.606Z',
      updatedAt: '2025-03-15T05:23:56.597Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'tenus',
      content: 'quia',
      createdAt: '2025-06-14T11:05:03.673Z',
      updatedAt: '2025-04-04T00:53:05.957Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Cathryn',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Virginia',
      createdAt: '2025-05-29T13:27:27.841Z',
      updatedAt: '2025-02-21T13:01:57.491Z',
      deletedAt: '2025-06-02T04:12:24.417Z',
    },
    {
      id: 3,
      name: 'Christelle',
      createdAt: '2025-12-20T00:33:30.493Z',
      updatedAt: '2025-06-12T06:42:38.296Z',
      deletedAt: '2025-03-20T04:00:24.228Z',
    },
    {
      id: 4,
      name: 'Matilda',
      createdAt: '2025-06-25T16:10:13.424Z',
      updatedAt: '2025-08-11T10:17:33.913Z',
      deletedAt: '2025-09-16T07:56:03.155Z',
    },
    {
      id: 5,
      name: 'Curtis',
      createdAt: '2025-12-16T01:48:22.610Z',
      updatedAt: '2025-12-14T18:29:39.878Z',
      deletedAt: '2025-10-07T05:36:56.501Z',
    },
    {
      id: 6,
      name: 'Kadin',
      createdAt: '2025-09-05T07:47:59.981Z',
      updatedAt: '2025-12-17T10:08:24.831Z',
      deletedAt: '2025-06-09T11:36:03.860Z',
    },
    {
      id: 7,
      name: 'Kristina',
      createdAt: '2025-10-10T15:11:18.197Z',
      updatedAt: '2025-10-08T10:48:03.200Z',
      deletedAt: '2025-12-24T21:29:38.324Z',
    },
    {
      id: 8,
      name: 'Milan',
      createdAt: '2025-06-11T22:40:04.407Z',
      updatedAt: '2025-10-21T01:58:37.318Z',
      deletedAt: '2025-03-03T19:02:39.790Z',
    },
    {
      id: 9,
      name: 'Kellie',
      createdAt: '2025-08-17T16:44:56.611Z',
      updatedAt: '2025-05-11T11:48:02.413Z',
      deletedAt: '2025-11-10T12:55:55.946Z',
    },
    {
      id: 10,
      name: 'Birdie',
      createdAt: '2025-08-26T22:05:00.416Z',
      updatedAt: '2025-10-12T11:34:25.580Z',
      deletedAt: '2025-04-11T16:54:42.213Z',
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
      createdAt: '2025-04-02T07:34:53.768Z',
      updatedAt: '2025-11-13T05:27:41.683Z',
      deletedAt: '2026-01-31T14:52:06.147Z',
    },
    {
      id: 3,
      userId: 3,
      userTypeId: 3,
      createdAt: '2025-05-21T16:56:00.315Z',
      updatedAt: '2025-06-15T23:08:03.949Z',
      deletedAt: '2025-10-25T11:46:50.765Z',
    },
    {
      id: 4,
      userId: 4,
      userTypeId: 4,
      createdAt: '2025-10-09T01:18:27.119Z',
      updatedAt: '2025-10-09T17:41:04.690Z',
      deletedAt: '2025-10-18T08:29:38.826Z',
    },
    {
      id: 5,
      userId: 5,
      userTypeId: 5,
      createdAt: '2025-02-11T19:01:33.286Z',
      updatedAt: '2025-07-25T13:48:21.713Z',
      deletedAt: '2025-04-13T23:31:52.929Z',
    },
    {
      id: 6,
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-11-15T15:26:40.895Z',
      updatedAt: '2025-08-15T10:32:34.299Z',
      deletedAt: '2025-03-21T23:16:50.439Z',
    },
    {
      id: 7,
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-03-12T06:26:35.340Z',
      updatedAt: '2026-01-18T00:58:47.559Z',
      deletedAt: '2025-11-17T16:43:32.835Z',
    },
    {
      id: 8,
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-03-05T01:38:47.494Z',
      updatedAt: '2025-12-04T15:17:25.385Z',
      deletedAt: '2025-12-03T17:16:02.563Z',
    },
    {
      id: 9,
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-12-05T23:35:54.831Z',
      updatedAt: '2025-12-15T00:48:06.897Z',
      deletedAt: '2025-07-16T09:06:43.533Z',
    },
    {
      id: 10,
      userId: 10,
      userTypeId: 10,
      createdAt: '2025-10-10T04:06:11.332Z',
      updatedAt: '2025-04-14T22:14:27.242Z',
      deletedAt: '2025-10-24T20:57:06.792Z',
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
