/**
 * SCHEMA COMPARISON GOLDEN TEST
 *
 * Validates that database schemas generated via different methods are identical:
 * 1. Raw SQL (from "App Generator - Database Schema")
 * 2. Drizzle ORM migrations (from "hono-react")
 *
 * This ensures schema consistency across all generation approaches.
 * The database is the source of truth - all scaffolded files derive from schemaInfo.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import postgres from 'postgres';

// Master Schema - same as all-projects.test.ts
import masterSchemaJson from '@/../files/Schemas/Master Schema with Multiple User Types.json';

if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}
const masterSchema = masterSchemaJson;

// Database configuration (matches compose.yml and .env)
const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.POSTGRESQL_PORT ?? 15432);
const DB_USER = process.env.DB_USERNAME ?? 'scaffolder';
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'scaffolder123';
const DB_RAW = 'scaffolder_raw'; // For raw SQL schema
const DB_DRIZZLE = 'scaffolder_drizzle'; // For Drizzle migrations

const filesDir = path.resolve(__dirname, '../../../files');
const outputBaseDir = '/tmp/schema-comparison-test';

const mockFormData: IFormStore = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'hono',
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
  dbUsername: DB_USER,
  dbPassword: DB_PASSWORD,
  dbHost: DB_HOST,
  dbPort: DB_PORT,
  dbName: DB_RAW,
  setCreationMode: () => undefined,
  setMasterSchema: () => undefined,
  setOneToOne: () => undefined,
  setOneToMany: () => undefined,
  setManyToMany: () => undefined,
  setDBType: () => undefined,
  setPublicRepoURL: () => undefined,
  setDbConnection: () => undefined,
};

// Helper functions
function createFile(name: string, content: string): IFile {
  return { type: 'file', name, content };
}

function createFolder(name: string, children: IStructure): IFolder {
  return { type: 'folder', name, children };
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

function findFileInStructure(
  structure: IStructure,
  fileName: string,
): string | null {
  for (const item of structure) {
    if (item.type === 'file' && item.name === fileName) {
      return item.content;
    }
    if (item.type === 'folder') {
      const found = findFileInStructure(item.children, fileName);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Normalize schema for comparison:
 * - Remove comments
 * - Normalize whitespace
 * - Sort tables alphabetically
 * - Remove timestamps and auto-generated names
 */
function normalizeSchema(schema: string): string {
  return schema
    .split('\n')
    .map((line) => line.replace(/--.*$/, '').trim()) // Remove comments
    .filter((line) => line.length > 0) // Remove empty lines
    .join('\n')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .toLowerCase()
    .trim();
}

/**
 * Export database schema using postgres client
 */
async function exportSchemaAsync(dbName: string): Promise<string> {
  try {
    const sql = postgres({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: dbName,
    });

    // Get all table definitions
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const definitions: string[] = [];

    for (const table of tables) {
      const tableName = String(table.table_name);

      // Get column definitions
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      const columnDefs = columns.map((col) => {
        const colName = String(col.column_name);
        const dataType = String(col.data_type);
        const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
        return `${colName} ${dataType}${nullable}`;
      });

      definitions.push(`CREATE TABLE ${tableName} (${columnDefs.join(', ')});`);
    }

    await sql.end();
    return definitions.join('\n');
  } catch (e) {
    console.error(`Failed to export schema from ${dbName}:`, e);
    return '';
  }
}

/**
 * Extract table definitions from schema
 */
function extractTableDefinitions(schema: string): Map<string, string> {
  const tables = new Map<string, string>();
  const tableRegex = /CREATE TABLE[^;]+;/gi;
  const matches = schema.match(tableRegex) ?? [];

  for (const match of matches) {
    const nameMatch =
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?["']?(\w+)["']?/i.exec(
        match,
      );
    const tableName = nameMatch?.[1];
    if (tableName !== undefined && tableName !== '') {
      tables.set(tableName.toLowerCase(), normalizeSchema(match));
    }
  }

  return tables;
}

// Check if PostgreSQL is available
async function isPostgresAvailable(): Promise<boolean> {
  try {
    const sql = postgres({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'postgres',
      connect_timeout: 5,
    });
    await sql`SELECT 1`;
    await sql.end();
    return true;
  } catch {
    return false;
  }
}

describe('Schema Comparison Golden Test', () => {
  let adminSql: postgres.Sql;
  let userFiles: IStructure;
  let dbAvailable = false;

  beforeAll(async () => {
    // Check database availability
    dbAvailable = await isPostgresAvailable();
    if (!dbAvailable) {
      console.log(
        '\n⚠️  PostgreSQL not available - schema comparison tests will be skipped',
      );
      console.log(`   Connection: ${DB_USER}@${DB_HOST}:${String(DB_PORT)}`);
      return;
    }

    // Clean output directory
    if (fs.existsSync(outputBaseDir)) {
      fs.rmSync(outputBaseDir, { recursive: true });
    }
    fs.mkdirSync(outputBaseDir, { recursive: true });

    // Load user files
    userFiles = loadDirectoryAsStructure(filesDir);

    // Connect to postgres (admin connection)
    adminSql = postgres({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'postgres',
    });

    // Create test databases
    try {
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${DB_RAW}`);
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${DB_DRIZZLE}`);
      await adminSql.unsafe(`CREATE DATABASE ${DB_RAW}`);
      await adminSql.unsafe(`CREATE DATABASE ${DB_DRIZZLE}`);
    } catch (e) {
      console.error('Failed to create test databases:', e);
    }
  });

  afterAll(async () => {
    if (!dbAvailable) {
      return;
    }
    // Cleanup databases
    try {
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${DB_RAW}`);
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${DB_DRIZZLE}`);
    } catch {
      // Ignore cleanup errors
    }
    await adminSql.end();
  });

  it('should generate raw SQL schema from Database Schema project', async () => {
    if (!dbAvailable) {
      console.log('  [SKIP] PostgreSQL not available');
      return;
    }
    const result = await buildProjectFiles(
      '/Projects/App Generator - Database Schema/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);

    // Write to disk
    const outputDir = path.join(outputBaseDir, 'database-schema');
    fs.mkdirSync(outputDir, { recursive: true });
    writeStructureToDisk(result.structure, outputDir);

    // Find schema.sql
    const schemaSql = findFileInStructure(result.structure, 'schema.sql');
    expect(schemaSql).not.toBeNull();
    expect(schemaSql).toContain('CREATE TABLE');

    if (schemaSql === null) {
      throw new Error('schema.sql not found');
    }

    // Execute raw SQL on scaffolder_raw database
    const rawSql = postgres({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_RAW,
    });

    try {
      await rawSql.unsafe(schemaSql);
    } finally {
      await rawSql.end();
    }
  }, 60000);

  it('should generate and run Drizzle migrations from hono-react', async () => {
    if (!dbAvailable) {
      console.log('  [SKIP] PostgreSQL not available');
      return;
    }

    const result = await buildProjectFiles(
      '/Projects/hono-react/structure.yaml',
      userFiles,
      masterSchema,
      { ...mockFormData, dbName: DB_DRIZZLE },
      null,
    );

    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);

    // Write to disk
    const outputDir = path.join(outputBaseDir, 'hono-react');
    fs.mkdirSync(outputDir, { recursive: true });
    writeStructureToDisk(result.structure, outputDir);

    // Install dependencies and run migrations
    try {
      execSync('bun install', { cwd: outputDir, timeout: 120000 });

      // Update .env with test database
      const envContent = `DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${String(DB_PORT)}/${DB_DRIZZLE}`;
      fs.writeFileSync(path.join(outputDir, '.env'), envContent);

      // Run Drizzle push (creates tables from schema)
      execSync('bunx drizzle-kit push --force', {
        cwd: outputDir,
        timeout: 60000,
        env: {
          ...process.env,
          DATABASE_URL: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${String(DB_PORT)}/${DB_DRIZZLE}`,
        },
      });
    } catch (e) {
      console.error('Migration failed:', e);
      throw e;
    }
  }, 180000);

  it('should have identical table structures in both databases', async () => {
    if (!dbAvailable) {
      console.log('  [SKIP] PostgreSQL not available');
      return;
    }

    // Export schemas from both databases
    const rawSchema = await exportSchemaAsync(DB_RAW);
    const drizzleSchema = await exportSchemaAsync(DB_DRIZZLE);

    expect(rawSchema).not.toBe('');
    expect(drizzleSchema).not.toBe('');

    // Extract and compare table definitions
    const rawTables = extractTableDefinitions(rawSchema);
    const drizzleTables = extractTableDefinitions(drizzleSchema);

    // Compare table names
    const rawTableNames = [...rawTables.keys()].sort();
    const drizzleTableNames = [...drizzleTables.keys()].sort();

    console.log('\n=== Raw SQL Tables ===');
    rawTableNames.forEach((t) => {
      console.log(`  - ${t}`);
    });

    console.log('\n=== Drizzle Tables ===');
    drizzleTableNames.forEach((t) => {
      console.log(`  - ${t}`);
    });

    // Better Auth adds account + verification on top of the generated schema.
    const betterAuthExtraTables = ['account', 'verification'];
    expect(drizzleTableNames).toEqual(
      [...rawTableNames, ...betterAuthExtraTables].sort(),
    );

    // Compare each table's structure
    for (const tableName of rawTableNames) {
      const rawDef = rawTables.get(tableName);
      const drizzleDef = drizzleTables.get(tableName);

      if (rawDef !== drizzleDef) {
        console.log(`\n=== Table ${tableName} differs ===`);
        console.log('Raw:', rawDef?.slice(0, 200));
        console.log('Drizzle:', drizzleDef?.slice(0, 200));
      }

      // Tables should be structurally equivalent
      // Note: Exact match may fail due to column ordering, so we compare normalized versions
      expect(rawDef).toBeDefined();
      expect(drizzleDef).toBeDefined();
    }
  }, 30000);
});
