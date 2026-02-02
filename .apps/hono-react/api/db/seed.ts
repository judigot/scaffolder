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
      productName: 'Amelia',
    },
    {
      id: 2,
      productName: 'Madilyn',
    },
    {
      id: 3,
      productName: 'Cyril',
    },
    {
      id: 4,
      productName: 'Asha',
    },
    {
      id: 5,
      productName: 'Dagmar',
    },
    {
      id: 6,
      productName: 'Hector',
    },
    {
      id: 7,
      productName: 'Amina',
    },
    {
      id: 8,
      productName: 'Jaden',
    },
    {
      id: 9,
      productName: 'Lavon',
    },
    {
      id: 10,
      productName: 'Lelia',
    },
  ],
  customer: [
    {
      id: 1,
      name: 'Mathias',
    },
    {
      id: 2,
      name: 'Luis',
    },
    {
      id: 3,
      name: 'Ronaldo',
    },
    {
      id: 4,
      name: 'Dawson',
    },
    {
      id: 5,
      name: 'Jordi',
    },
    {
      id: 6,
      name: 'Edison',
    },
    {
      id: 7,
      name: 'Dane',
    },
    {
      id: 8,
      name: 'Mable',
    },
    {
      id: 9,
      name: 'Damien',
    },
    {
      id: 10,
      name: 'Hazel',
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
      email: 'oleta.kuhn84@example.com',
      username: 'franz39',
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
      email: 'marlin.schuppe@example.com',
      username: 'mollie.reynolds',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'General',
      lastName: 'Theodore',
      avatarUrl: 'alius',
      emailVerified: false,
      createdAt: '2025-06-08T06:44:28.808Z',
      updatedAt: '2025-11-13T20:19:29.522Z',
    },
    {
      id: 3,
      email: 'adalberto55@example.net',
      username: 'tiffany_tremblay62',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Lilly',
      lastName: 'Danika',
      avatarUrl: 'astrum',
      emailVerified: true,
      createdAt: '2025-10-05T00:02:18.167Z',
      updatedAt: '2026-01-02T04:01:23.780Z',
    },
    {
      id: 4,
      email: 'kody_lubowitz58@example.com',
      username: 'della_mueller',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Abdul',
      lastName: 'Bart',
      avatarUrl: 'spes',
      emailVerified: true,
      createdAt: '2025-09-17T12:09:26.490Z',
      updatedAt: '2025-06-10T10:52:42.844Z',
    },
    {
      id: 5,
      email: 'ruben_marquardt9@example.net',
      username: 'zena_langosh14',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Mckenna',
      lastName: 'Braeden',
      avatarUrl: 'arma',
      emailVerified: true,
      createdAt: '2025-12-10T12:24:17.341Z',
      updatedAt: '2026-01-30T03:02:42.220Z',
    },
    {
      id: 6,
      email: 'jamil10@example.org',
      username: 'horacio.fadel',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Garret',
      lastName: 'Fae',
      avatarUrl: 'acies',
      emailVerified: true,
      createdAt: '2025-06-18T15:59:18.144Z',
      updatedAt: '2025-08-28T15:24:49.841Z',
    },
    {
      id: 7,
      email: 'kyler_koss83@example.org',
      username: 'fabiola17',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Tom',
      lastName: 'Cleora',
      avatarUrl: 'placeat',
      emailVerified: false,
      createdAt: '2025-06-21T20:16:49.420Z',
      updatedAt: '2025-06-19T12:49:19.111Z',
    },
    {
      id: 8,
      email: 'felicia54@example.com',
      username: 'russel_kilback',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Jailyn',
      lastName: 'Elenor',
      avatarUrl: 'adeo',
      emailVerified: true,
      createdAt: '2025-09-03T16:06:25.765Z',
      updatedAt: '2026-01-28T01:49:55.911Z',
    },
    {
      id: 9,
      email: 'moises.king31@example.com',
      username: 'amara_gerlach',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Sabryna',
      lastName: 'Opal',
      avatarUrl: 'cometes',
      emailVerified: false,
      createdAt: '2025-09-03T16:57:15.559Z',
      updatedAt: '2025-02-07T18:26:33.630Z',
    },
    {
      id: 10,
      email: 'jeremie.waelchi20@example.com',
      username: 'cheyanne27',
      passwordHash:
        '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      firstName: 'Sierra',
      lastName: 'Kathryn',
      avatarUrl: 'somnus',
      emailVerified: true,
      createdAt: '2026-01-22T19:23:04.513Z',
      updatedAt: '2025-05-23T15:19:50.297Z',
    },
  ],
  session: [
    {
      id: 1,
      userId: 1,
      expiresAt: '2025-05-16T05:20:23.833Z',
    },
    {
      id: 2,
      userId: 2,
      expiresAt: '2025-10-07T19:09:13.635Z',
    },
    {
      id: 3,
      userId: 3,
      expiresAt: '2025-07-20T15:50:47.389Z',
    },
    {
      id: 4,
      userId: 4,
      expiresAt: '2025-12-04T23:39:03.282Z',
    },
    {
      id: 5,
      userId: 5,
      expiresAt: '2025-09-06T22:45:26.772Z',
    },
    {
      id: 6,
      userId: 6,
      expiresAt: '2025-04-24T19:42:36.694Z',
    },
    {
      id: 7,
      userId: 7,
      expiresAt: '2025-10-04T08:32:36.102Z',
    },
    {
      id: 8,
      userId: 8,
      expiresAt: '2025-11-04T08:18:02.328Z',
    },
    {
      id: 9,
      userId: 9,
      expiresAt: '2025-07-05T03:14:07.796Z',
    },
    {
      id: 10,
      userId: 10,
      expiresAt: '2025-07-06T02:21:10.631Z',
    },
  ],
  oauth_account: [
    {
      providerId: 'deputo',
      providerUserId: 'validus',
      userId: 1,
    },
    {
      providerId: 'acidus',
      providerUserId: 'vereor',
      userId: 2,
    },
    {
      providerId: 'denego',
      providerUserId: 'deserunt',
      userId: 3,
    },
    {
      providerId: 'ceno',
      providerUserId: 'defungo',
      userId: 4,
    },
    {
      providerId: 'aspernatur',
      providerUserId: 'clam',
      userId: 5,
    },
    {
      providerId: 'voluptatem',
      providerUserId: 'suspendo',
      userId: 6,
    },
    {
      providerId: 'canonicus',
      providerUserId: 'adulatio',
      userId: 7,
    },
    {
      providerId: 'tardus',
      providerUserId: 'labore',
      userId: 8,
    },
    {
      providerId: 'tener',
      providerUserId: 'officiis',
      userId: 9,
    },
    {
      providerId: 'tergiversatio',
      providerUserId: 'alveus',
      userId: 10,
    },
  ],
  profile: [
    {
      id: 1,
      userId: 1,
      bio: 'quod',
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      bio: 'crux',
      createdAt: '2025-04-11T02:26:43.159Z',
      updatedAt: '2026-02-01T00:08:21.601Z',
    },
    {
      id: 3,
      userId: 3,
      bio: 'velit',
      createdAt: '2025-11-24T14:53:36.676Z',
      updatedAt: '2025-12-02T19:11:28.360Z',
    },
    {
      id: 4,
      userId: 4,
      bio: 'nobis',
      createdAt: '2025-06-22T23:38:59.979Z',
      updatedAt: '2026-01-24T04:27:48.165Z',
    },
    {
      id: 5,
      userId: 5,
      bio: 'alter',
      createdAt: '2025-08-31T15:55:23.627Z',
      updatedAt: '2025-05-22T20:35:37.670Z',
    },
    {
      id: 6,
      userId: 6,
      bio: 'degusto',
      createdAt: '2025-05-17T19:03:43.639Z',
      updatedAt: '2025-03-24T18:27:21.328Z',
    },
    {
      id: 7,
      userId: 7,
      bio: 'sophismata',
      createdAt: '2025-07-29T23:04:51.181Z',
      updatedAt: '2025-03-18T06:43:48.345Z',
    },
    {
      id: 8,
      userId: 8,
      bio: 'teneo',
      createdAt: '2025-02-27T08:23:38.582Z',
      updatedAt: '2025-09-01T23:20:40.877Z',
    },
    {
      id: 9,
      userId: 9,
      bio: 'tandem',
      createdAt: '2025-05-28T13:08:26.665Z',
      updatedAt: '2025-12-10T09:21:47.504Z',
    },
    {
      id: 10,
      userId: 10,
      bio: 'denego',
      createdAt: '2025-09-06T11:26:23.367Z',
      updatedAt: '2025-06-09T05:02:20.553Z',
    },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: 'textilis',
      content: null,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 2,
      userId: 2,
      title: 'debilito',
      content: 'adicio',
      createdAt: '2025-07-07T22:25:57.660Z',
      updatedAt: '2026-01-31T22:22:52.830Z',
    },
    {
      id: 3,
      userId: 3,
      title: 'succurro',
      content: 'tamen',
      createdAt: '2025-06-23T06:00:39.939Z',
      updatedAt: '2025-12-16T19:08:06.264Z',
    },
    {
      id: 4,
      userId: 4,
      title: 'summa',
      content: 'tamisium',
      createdAt: '2025-05-08T03:38:21.577Z',
      updatedAt: '2025-02-27T20:28:49.371Z',
    },
    {
      id: 5,
      userId: 5,
      title: 'bos',
      content: 'adopto',
      createdAt: '2025-10-09T01:55:58.298Z',
      updatedAt: '2025-06-16T06:40:25.135Z',
    },
    {
      id: 6,
      userId: 6,
      title: 'crebro',
      content: 'tempora',
      createdAt: '2025-11-08T02:34:18.949Z',
      updatedAt: '2025-07-03T02:17:29.495Z',
    },
    {
      id: 7,
      userId: 7,
      title: 'aequitas',
      content: 'vado',
      createdAt: '2025-09-23T01:53:36.207Z',
      updatedAt: '2025-03-13T12:07:29.964Z',
    },
    {
      id: 8,
      userId: 8,
      title: 'decipio',
      content: 'sufficio',
      createdAt: '2025-09-22T04:58:32.324Z',
      updatedAt: '2025-08-30T04:52:42.153Z',
    },
    {
      id: 9,
      userId: 9,
      title: 'tum',
      content: 'sollicito',
      createdAt: '2025-07-16T11:51:46.552Z',
      updatedAt: '2025-08-30T15:39:38.770Z',
    },
    {
      id: 10,
      userId: 10,
      title: 'conitor',
      content: 'tempore',
      createdAt: '2025-11-22T22:07:51.920Z',
      updatedAt: '2025-10-14T06:20:02.259Z',
    },
  ],
  user_type: [
    {
      id: 1,
      name: 'Gardner',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    },
    {
      id: 2,
      name: 'Robert',
      createdAt: '2025-05-06T08:53:28.387Z',
      updatedAt: '2025-07-15T01:28:42.967Z',
      deletedAt: '2025-07-27T23:14:19.951Z',
    },
    {
      id: 3,
      name: 'Griffin',
      createdAt: '2025-03-24T07:41:44.360Z',
      updatedAt: '2025-04-24T23:08:48.313Z',
      deletedAt: '2026-01-31T08:23:18.340Z',
    },
    {
      id: 4,
      name: 'Einar',
      createdAt: '2025-06-16T17:09:14.710Z',
      updatedAt: '2026-01-15T13:10:34.589Z',
      deletedAt: '2026-01-11T19:08:09.881Z',
    },
    {
      id: 5,
      name: 'Woodrow',
      createdAt: '2025-09-26T11:55:22.401Z',
      updatedAt: '2025-11-15T18:05:08.502Z',
      deletedAt: '2025-08-14T05:47:38.723Z',
    },
    {
      id: 6,
      name: 'Aileen',
      createdAt: '2025-07-23T03:10:49.815Z',
      updatedAt: '2025-09-09T03:00:13.973Z',
      deletedAt: '2025-11-28T21:11:12.125Z',
    },
    {
      id: 7,
      name: 'Vern',
      createdAt: '2025-10-30T19:50:58.333Z',
      updatedAt: '2025-04-11T03:08:27.328Z',
      deletedAt: '2025-08-05T11:19:48.129Z',
    },
    {
      id: 8,
      name: 'Emmie',
      createdAt: '2025-10-08T02:18:07.804Z',
      updatedAt: '2025-11-26T04:08:34.371Z',
      deletedAt: '2025-10-13T11:02:44.371Z',
    },
    {
      id: 9,
      name: 'Alfreda',
      createdAt: '2025-02-06T10:14:25.677Z',
      updatedAt: '2026-01-20T13:22:39.960Z',
      deletedAt: '2025-07-08T20:25:20.467Z',
    },
    {
      id: 10,
      name: 'Arvilla',
      createdAt: '2026-02-01T05:14:55.946Z',
      updatedAt: '2025-03-28T17:30:12.878Z',
      deletedAt: '2025-04-05T17:33:01.966Z',
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
      createdAt: '2025-07-04T10:03:01.869Z',
      updatedAt: '2025-02-23T17:48:46.233Z',
      deletedAt: '2025-08-17T06:22:58.700Z',
    },
    {
      userId: 3,
      userTypeId: 3,
      createdAt: '2025-03-27T10:13:17.937Z',
      updatedAt: '2025-12-07T17:17:25.311Z',
      deletedAt: '2025-11-07T18:37:08.973Z',
    },
    {
      userId: 4,
      userTypeId: 4,
      createdAt: '2025-06-12T04:29:29.966Z',
      updatedAt: '2025-08-30T07:08:17.739Z',
      deletedAt: '2026-01-13T14:49:27.242Z',
    },
    {
      userId: 5,
      userTypeId: 5,
      createdAt: '2026-01-05T20:58:08.800Z',
      updatedAt: '2025-10-16T19:22:42.350Z',
      deletedAt: '2025-11-25T06:20:32.260Z',
    },
    {
      userId: 6,
      userTypeId: 6,
      createdAt: '2025-10-26T16:29:44.560Z',
      updatedAt: '2025-10-02T11:13:59.258Z',
      deletedAt: '2025-03-13T07:28:43.405Z',
    },
    {
      userId: 7,
      userTypeId: 7,
      createdAt: '2025-05-13T16:47:41.590Z',
      updatedAt: '2025-12-08T03:28:53.709Z',
      deletedAt: '2026-01-18T09:46:14.848Z',
    },
    {
      userId: 8,
      userTypeId: 8,
      createdAt: '2025-04-02T14:22:14.953Z',
      updatedAt: '2025-03-17T02:22:11.440Z',
      deletedAt: '2025-08-23T05:42:09.660Z',
    },
    {
      userId: 9,
      userTypeId: 9,
      createdAt: '2025-03-01T15:06:26.354Z',
      updatedAt: '2025-04-24T05:47:51.296Z',
      deletedAt: '2025-06-04T10:58:22.708Z',
    },
    {
      userId: 10,
      userTypeId: 10,
      createdAt: '2025-02-04T05:14:18.224Z',
      updatedAt: '2025-06-13T16:10:26.690Z',
      deletedAt: '2026-01-14T15:16:14.102Z',
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