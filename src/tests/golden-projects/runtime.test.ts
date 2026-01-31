/**
 * Runtime Golden Test
 *
 * Verifies generated projects work at runtime:
 * 1. Generate project with Master Schema
 * 2. Create test database
 * 3. Run Drizzle migrations
 * 4. Execute seed file
 * 5. Start API server
 * 6. Test CRUD endpoints
 *
 * Requires: PostgreSQL running via `bun run dev:full`
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import postgres from 'postgres';

// Use Master Schema with Multiple User Types for comprehensive coverage
import masterSchemaJson from '@/../files/Schemas/Master Schema with Multiple User Types.json';

// Validate JSON matches expected shape at runtime
// Uses structural type guard - validates tableName and columnsInfo exist
if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}
const masterSchema = masterSchemaJson;

const TEST_DB_NAME = 'scaffolder';
const TEST_PORT = 3999;
const OUTPUT_DIR = '/tmp/golden-runtime-test';

// Database connection config (matches compose.yml)
const DB_CONFIG = {
  host: 'localhost',
  port: 15432,
  user: 'scaffolder',
  password: 'scaffolder123',
  database: 'postgres', // Connect to postgres db for admin operations
};

const mockFormData: IFormStore = {
  backendUrl: `http://localhost:${String(TEST_PORT)}`,
  dbType: 'postgresql',
  framework: 'hono',
  // Required IFormStore fields with defaults
  schemaInput: {},
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: false,
  outputOnSingleFile: false,
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: 'Schema Builder',
  dbUsername: '',
  dbPassword: '',
  dbHost: '',
  dbPort: 0,
  dbName: '',
  setCreationMode: () => undefined,
  setMasterSchema: () => undefined,
  setOneToOne: () => undefined,
  setOneToMany: () => undefined,
  setManyToMany: () => undefined,
  setDBType: () => undefined,
  setPublicRepoURL: () => undefined,
  setDbConnection: () => undefined,
};

const filesDir = path.resolve(__dirname, '../../../files');

let serverProcess: ChildProcess | null = null;
let testSql: postgres.Sql | null = null;

// Type-safe factory functions for IStructure items
function createFile(name: string, content: string): IFile {
  return { type: 'file', name, content };
}

function createFolder(name: string, children: IStructure): IFolder {
  return { type: 'folder', name, children };
}

// Type guard for objects with string properties
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Type-safe property access
function getStringProp(obj: unknown, key: string): string {
  if (isRecord(obj) && typeof obj[key] === 'string') {
    return obj[key];
  }
  return '';
}

function getNumberProp(obj: unknown, key: string): number {
  if (isRecord(obj)) {
    const val = obj[key];
    if (typeof val === 'number') {
      return val;
    }
    if (typeof val === 'string') {
      return parseInt(val, 10);
    }
  }
  return 0;
}

function getUnknownProp(obj: unknown, key: string): unknown {
  if (isRecord(obj)) {
    return obj[key];
  }
  return undefined;
}

// Type-safe error extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error)) {
    const message = error.message;
    if (typeof message === 'string') {
      return message;
    }
    const stderr = error.stderr;
    if (typeof stderr === 'string') {
      return stderr;
    }
  }
  return String(error);
}

function getExecErrorDetails(error: unknown): {
  message: string;
  stderr: string;
  stdout: string;
} {
  if (isRecord(error)) {
    return {
      message: getStringProp(error, 'message'),
      stderr: getStringProp(error, 'stderr'),
      stdout: getStringProp(error, 'stdout'),
    };
  }
  return { message: String(error), stderr: '', stdout: '' };
}

function loadDirectoryAsStructure(dirPath: string): IStructure {
  const items: IStructure = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      items.push(createFolder(entry.name, loadDirectoryAsStructure(fullPath)));
    } else {
      items.push(createFile(entry.name, fs.readFileSync(fullPath, 'utf-8')));
    }
  }
  return items;
}

function writeStructureToDisk(structure: IStructure, basePath: string): void {
  for (const item of structure) {
    const itemPath = path.join(basePath, item.name);
    if (item.type === 'folder') {
      fs.mkdirSync(itemPath, { recursive: true });
      writeStructureToDisk(item.children, itemPath);
    } else {
      fs.mkdirSync(path.dirname(itemPath), { recursive: true });
      fs.writeFileSync(itemPath, item.content);
    }
  }
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs = 60000,
): { success: boolean; error?: string; stdout?: string } {
  try {
    const stdout = execSync(command, {
      cwd,
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${String(DB_CONFIG.port)}/${TEST_DB_NAME}`,
      },
    });
    return { success: true, stdout };
  } catch (err: unknown) {
    const details = getExecErrorDetails(err);
    return {
      success: false,
      error: details.stderr !== '' ? details.stderr : details.message,
      stdout: details.stdout,
    };
  }
}

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`  Server ready after ${String(i + 1)} attempts`);
        return true;
      }
      if (i === 0) {
        const body = await res.text();
        console.log(
          `  Attempt ${String(i + 1)}: status ${String(res.status)}, body: ${body.slice(0, 200)}`,
        );
      }
    } catch (err: unknown) {
      if (i % 5 === 0) {
        console.log(`  Attempt ${String(i + 1)}: ${getErrorMessage(err)}`);
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const sql = postgres({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
    });
    await sql`SELECT 1`;
    await sql.end();
    return true;
  } catch {
    return false;
  }
}

describe('Runtime Golden Test', () => {
  // Skip if database is not available
  beforeAll(async () => {
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
      console.log(
        '\n⚠️  PostgreSQL not available. Run `bun run dev:full` first.\n',
      );
      return;
    }

    // Clean up previous test
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }

    // Create admin connection to manage test database
    const adminSql = postgres({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
    });

    // Drop and recreate test database
    try {
      // Terminate existing connections
      await adminSql`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = ${TEST_DB_NAME}
        AND pid <> pg_backend_pid()
      `;
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      await adminSql.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
    } finally {
      await adminSql.end();
    }

    // Connect to test database
    testSql = postgres({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: TEST_DB_NAME,
    });
  }, 30000);

  afterAll(async () => {
    // Stop server
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }

    // Close test database connection
    if (testSql) {
      await testSql.end();
      testSql = null;
    }

    // Clean up test database
    try {
      const adminSql = postgres({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
      });
      await adminSql`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = ${TEST_DB_NAME}
        AND pid <> pg_backend_pid()
      `;
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      await adminSql.end();
    } catch {
      // Ignore cleanup errors
    }
  }, 10000);

  it('should generate project files', async () => {
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable) {
      console.log('  [SKIP] Database not available');
      return;
    }

    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/hono-react/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);

    // Write to disk
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    writeStructureToDisk(result.structure, OUTPUT_DIR);

    // Verify key files exist
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'api/db/schema.ts'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'api/db/seed.ts'))).toBe(true);
  }, 30000);

  it('should install dependencies', async () => {
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable || !fs.existsSync(OUTPUT_DIR)) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    const result = runCommand('bun install', OUTPUT_DIR, 120000);

    if (!result.success) {
      console.log('bun install failed:', result.error);
    }

    expect(result.success).toBe(true);
  }, 120000);

  it('should run database migrations', async () => {
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable || !fs.existsSync(path.join(OUTPUT_DIR, 'node_modules'))) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    // Generate and run migrations using drizzle-kit
    const pushResult = runCommand('bunx drizzle-kit push', OUTPUT_DIR, 60000);

    if (!pushResult.success) {
      console.log('drizzle-kit push failed:', pushResult.error);
    }

    expect(pushResult.success).toBe(true);

    // Verify tables were created
    if (testSql) {
      const tables = await testSql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
      `;
      expect(tables.length).toBeGreaterThan(0);
      console.log(
        `  Created ${String(tables.length)} tables:`,
        tables.map((t) => getStringProp(t, 'table_name')).join(', '),
      );
    }
  }, 60000);

  it('should seed the database', async () => {
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable || !fs.existsSync(path.join(OUTPUT_DIR, 'node_modules'))) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    const result = runCommand('bun run api/db/seed.ts', OUTPUT_DIR, 30000);

    if (!result.success) {
      console.log('Seed failed:', result.error);
      console.log('Stdout:', result.stdout);
    }

    expect(result.success).toBe(true);

    // Verify data was inserted
    if (testSql) {
      const userCount = await testSql`SELECT COUNT(*) as count FROM "user"`;
      const count = getNumberProp(userCount[0], 'count');
      expect(count).toBeGreaterThan(0);
      console.log(`  Seeded ${String(count)} users`);
    }
  }, 30000);

  it('should start the API server', async () => {
    const dbAvailable = await checkDatabaseConnection();
    if (!dbAvailable || !fs.existsSync(path.join(OUTPUT_DIR, 'node_modules'))) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    // Kill any process on test port first
    try {
      execSync(
        `lsof -ti:${String(TEST_PORT)} | xargs kill -9 2>/dev/null || true`,
        {
          stdio: 'pipe',
        },
      );
    } catch {
      // Ignore errors
    }

    // Start server in background
    serverProcess = spawn('bun', ['run', 'api/index.ts'], {
      cwd: OUTPUT_DIR,
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        DATABASE_URL: `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${String(DB_CONFIG.port)}/${TEST_DB_NAME}`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Capture server output for debugging
    let serverOutput = '';
    let serverError = '';
    serverProcess.stdout?.on('data', (data: Buffer) => {
      serverOutput += data.toString();
    });
    serverProcess.stderr?.on('data', (data: Buffer) => {
      serverError += data.toString();
    });

    // Wait for server to be ready
    const serverReady = await waitForServer(
      `http://localhost:${String(TEST_PORT)}/api/health`,
    );

    if (!serverReady) {
      console.log('Server failed to start');
      console.log('Server stdout:', serverOutput);
      console.log('Server stderr:', serverError);
    }

    expect(serverReady).toBe(true);
  }, 30000);

  it('should GET /api/user (list users)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    const res = await fetch(`http://localhost:${String(TEST_PORT)}/api/user`);
    expect(res.ok).toBe(true);

    const data: unknown = await res.json();
    expect(Array.isArray(data)).toBe(true);
    if (Array.isArray(data)) {
      expect(data.length).toBeGreaterThan(0);
      console.log(`  GET /api/user returned ${String(data.length)} users`);
    }
  });

  it('should GET /api/user/:id (single user)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    const res = await fetch(`http://localhost:${String(TEST_PORT)}/api/user/1`);
    expect(res.ok).toBe(true);

    const data: unknown = await res.json();
    expect(data).toHaveProperty('id', 1);
  });

  it('should POST /api/user (create user)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    const newUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch(`http://localhost:${String(TEST_PORT)}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });

    expect(res.ok).toBe(true);
    const data: unknown = await res.json();
    expect(data).toHaveProperty('id');
    const id = getUnknownProp(data, 'id');
    console.log(`  Created user with ID: ${String(id)}`);
  });

  it('should PUT /api/user/:id (update user)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    const update = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com',
      username: 'updateduser',
      password: 'newpassword',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/user/1`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      },
    );

    expect(res.ok).toBe(true);

    // Verify update
    const getRes = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/user/1`,
    );
    const data: unknown = await getRes.json();
    const firstName = getStringProp(data, 'firstName');
    expect(firstName).toBe('Updated');
  });

  it('should DELETE /api/user/:id (delete user)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    // Get a user to delete (use one we created)
    const listRes = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/user`,
    );
    const users: unknown = await listRes.json();
    if (!Array.isArray(users) || users.length === 0) {
      console.log('  [SKIP] No users to delete');
      return;
    }
    const userToDelete: unknown = users[users.length - 1];
    const idToDelete = getUnknownProp(userToDelete, 'id');

    const res = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/user/${String(idToDelete)}`,
      {
        method: 'DELETE',
      },
    );

    expect(res.ok).toBe(true);

    // Verify deletion
    const verifyRes = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/user/${String(idToDelete)}`,
    );
    expect(verifyRes.status).toBe(404);
  });

  it('should test related entities (posts)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    // Get posts
    const res = await fetch(`http://localhost:${String(TEST_PORT)}/api/posts`);
    expect(res.ok).toBe(true);

    const posts: unknown = await res.json();
    expect(Array.isArray(posts)).toBe(true);
    if (Array.isArray(posts)) {
      console.log(`  GET /api/posts returned ${String(posts.length)} posts`);
    }
  });

  it('should test many-to-many entities (orders and products)', async () => {
    if (!serverProcess) {
      console.log('  [SKIP] Server not running');
      return;
    }

    // Get orders
    const ordersRes = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/order`,
    );
    expect(ordersRes.ok).toBe(true);
    const orders: unknown = await ordersRes.json();
    if (Array.isArray(orders)) {
      console.log(`  GET /api/order returned ${String(orders.length)} orders`);
    }

    // Get products
    const productsRes = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/product`,
    );
    expect(productsRes.ok).toBe(true);
    const products: unknown = await productsRes.json();
    if (Array.isArray(products)) {
      console.log(
        `  GET /api/product returned ${String(products.length)} products`,
      );
    }

    // Get order_product (pivot)
    const pivotRes = await fetch(
      `http://localhost:${String(TEST_PORT)}/api/order-product`,
    );
    expect(pivotRes.ok).toBe(true);
    const pivot: unknown = await pivotRes.json();
    if (Array.isArray(pivot)) {
      console.log(
        `  GET /api/order-product returned ${String(pivot.length)} records`,
      );
    }
  });
});
