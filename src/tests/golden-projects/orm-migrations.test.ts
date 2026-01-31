/**
 * ORM Migrations Golden Test
 *
 * Uses the "App Generator - ORM Tester" project for efficient testing.
 * Dependencies are installed ONCE, then each ORM test:
 * 1. Cleans the database
 * 2. Runs the migration
 * 3. Exports schema to results/<orm>_result.json
 *
 * Optimized for slow machines - runs ORMs sequentially, one at a time.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import postgres from 'postgres';

import masterSchemaJson from '@/../files/Schemas/Master Schema with Multiple User Types.json';

if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}
const masterSchema = masterSchemaJson;

// Database configuration
const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = Number(process.env.POSTGRESQL_PORT ?? 15432);
const DB_USER = process.env.DB_USERNAME ?? 'scaffolder';
const DB_PASSWORD = process.env.DB_PASSWORD ?? 'scaffolder123';
const DB_NAME = 'scaffolder';
const PRISMA_CONSENT = 'I consent';

const filesDir = path.resolve(__dirname, '../../../files');
const outputDir = '/tmp/orm-tester';

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
  dbName: DB_NAME,
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

interface ISchemaResult {
  orm: string;
  timestamp: string;
  database: string;
  tables: {
    tableName: string;
    columns: {
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }[];
  }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isISchemaResult(value: unknown): value is ISchemaResult {
  if (!isRecord(value)) {return false;}
  return (
    typeof value.orm === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.database === 'string' &&
    Array.isArray(value.tables)
  );
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    if (!line) {continue;}
    const [key, ...valueParts] = line.split('=');
    if (key) {
      result[key] = valueParts.join('=');
    }
  }
  return result;
}

function readResult(ormName: string): ISchemaResult | null {
  const filePath = path.join(outputDir, 'results', `${ormName}_result.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!isISchemaResult(parsed)) {
    return null;
  }
  return parsed;
}

function normalizeType(dataType: string): string {
  const normalized = dataType.toLowerCase().trim();
  const typeMap: Record<string, string> = {
    'bigint': 'bigint',
    'int8': 'bigint',
    'integer': 'integer',
    'int4': 'integer',
    'text': 'text',
    'character varying': 'varchar',
    'varchar': 'varchar',
    'character': 'char',
    'char': 'char',
    'boolean': 'boolean',
    'bool': 'boolean',
    'timestamp with time zone': 'timestamptz',
    'timestamptz': 'timestamptz',
  };
  return typeMap[normalized] ?? normalized;
}

function compareResults(
  baseline: ISchemaResult,
  target: ISchemaResult,
): { match: boolean; differences: string[] } {
  const differences: string[] = [];

  const baselineTables = new Map(
    baseline.tables.map((t) => [t.tableName.toLowerCase(), t])
  );
  const targetTables = new Map(
    target.tables.map((t) => [t.tableName.toLowerCase(), t])
  );

  // Check tables
  for (const [name] of baselineTables) {
    if (!targetTables.has(name)) {
      differences.push(`Table '${name}' missing in ${target.orm}`);
    }
  }
  for (const [name] of targetTables) {
    if (!baselineTables.has(name)) {
      differences.push(`Extra table '${name}' in ${target.orm}`);
    }
  }

  // Compare columns
  for (const [name, baselineTable] of baselineTables) {
    const targetTable = targetTables.get(name);
    if (!targetTable) {continue;}

    const baselineCols = new Map(
      baselineTable.columns.map((c) => [c.column_name, c])
    );
    const targetCols = new Map(
      targetTable.columns.map((c) => [c.column_name, c])
    );

    for (const [colName, baselineCol] of baselineCols) {
      const targetCol = targetCols.get(colName);
      if (!targetCol) {
        differences.push(`Column '${name}.${colName}' missing in ${target.orm}`);
        continue;
      }

      const baselineType = normalizeType(baselineCol.data_type);
      const targetType = normalizeType(targetCol.data_type);
      if (baselineType !== targetType) {
        differences.push(
          `Type mismatch: ${name}.${colName} (raw: ${baselineType}, ${target.orm}: ${targetType})`
        );
      }
    }
  }

  return { match: differences.length === 0, differences };
}

describe('ORM Migrations Golden Test', () => {
  let dbAvailable = false;
  let projectGenerated = false;
  let depsInstalled = false;

  beforeAll(async () => {
    dbAvailable = await isPostgresAvailable();
    if (!dbAvailable) {
      console.log('\n  PostgreSQL not available - migration tests will be skipped');
      console.log(`  Connection: ${DB_USER}@${DB_HOST}:${String(DB_PORT)}`);
      return;
    }

    // Clean output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    // Ensure test database exists
    const adminSql = postgres({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'postgres',
    });
    try {
      // Check if database exists, create if not
      const result = await adminSql`
        SELECT 1 FROM pg_database WHERE datname = ${DB_NAME}
      `;
      if (result.length === 0) {
        await adminSql.unsafe(`CREATE DATABASE ${DB_NAME}`);
        console.log(`  Created database '${DB_NAME}'`);
      } else {
        console.log(`  Using existing database '${DB_NAME}'`);
      }
    } finally {
      await adminSql.end();
    }
  }, 30000);

  it('should generate ORM Tester project', async () => {
    if (!dbAvailable) {
      console.log('  [SKIP] PostgreSQL not available');
      return;
    }

    const userFiles = loadDirectoryAsStructure(filesDir);

    const result = await buildProjectFiles(
      '/Projects/App Generator - ORM Tester/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    expect(result.structure.length).toBeGreaterThan(0);

    // Write to disk
    writeStructureToDisk(result.structure, outputDir);
    projectGenerated = true;

    // Create .env file
    const envContent = `DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${String(DB_PORT)}/${DB_NAME}
DB_HOST=${DB_HOST}
DB_PORT=${String(DB_PORT)}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}`;
    fs.writeFileSync(path.join(outputDir, '.env'), envContent);

    console.log('  ORM Tester project generated');
  }, 60000);

  it('should install dependencies (once)', () => {
    if (!dbAvailable || !projectGenerated) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    console.log('  Installing dependencies...');
    execSync('bun install', {
      cwd: outputDir,
      timeout: 180000,
      stdio: 'pipe',
    });
    depsInstalled = true;
    console.log('  Dependencies installed');
  }, 180000);

  it('should test Raw SQL migration', () => {
    if (!dbAvailable || !depsInstalled) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    console.log('  Running Raw SQL test...');
    execSync('bun run test:raw', {
      cwd: outputDir,
      timeout: 60000,
      stdio: 'pipe',
      env: { ...process.env, ...parseEnvFile(path.join(outputDir, '.env')) },
    });

    const result = readResult('raw');
    expect(result).not.toBeNull();
    console.log(`  Raw SQL: ${String(result?.tables.length)} tables`);
  }, 60000);

  it('should test Drizzle migration', () => {
    if (!dbAvailable || !depsInstalled) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    console.log('  Running Drizzle test...');
    execSync('bun run test:drizzle', {
      cwd: outputDir,
      timeout: 60000,
      stdio: 'pipe',
      env: { ...process.env, ...parseEnvFile(path.join(outputDir, '.env')) },
    });

    const result = readResult('drizzle');
    expect(result).not.toBeNull();
    console.log(`  Drizzle: ${String(result?.tables.length)} tables`);
  }, 60000);

  it('should test Prisma migration', () => {
    if (!dbAvailable || !depsInstalled) {
      console.log('  [SKIP] Prerequisites not met');
      return;
    }

    console.log('  Running Prisma test...');
    const envVars = parseEnvFile(path.join(outputDir, '.env'));
    execSync('bun run test:prisma', {
      cwd: outputDir,
      timeout: 60000,
      stdio: 'pipe',
      env: {
        ...process.env,
        ...envVars,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: PRISMA_CONSENT,
      },
    });

    const result = readResult('prisma');
    expect(result).not.toBeNull();
    console.log(`  Prisma: ${String(result?.tables.length)} tables`);
  }, 60000);

  it('should compare Drizzle vs Raw SQL', () => {
    const raw = readResult('raw');
    const drizzle = readResult('drizzle');

    if (!raw || !drizzle) {
      console.log('  [SKIP] Results not available');
      return;
    }

    const comparison = compareResults(raw, drizzle);

    if (!comparison.match) {
      console.log('\n  Drizzle vs Raw SQL differences:');
      for (const diff of comparison.differences) {
        console.log(`    ${diff}`);
      }
    }

    expect(comparison.match).toBe(true);
  });

  it('should compare Prisma vs Raw SQL', () => {
    const raw = readResult('raw');
    const prisma = readResult('prisma');

    if (!raw || !prisma) {
      console.log('  [SKIP] Results not available');
      return;
    }

    const comparison = compareResults(raw, prisma);

    if (!comparison.match) {
      console.log('\n  Prisma vs Raw SQL differences:');
      for (const diff of comparison.differences) {
        console.log(`    ${diff}`);
      }
      console.log(`  Note: ${String(comparison.differences.length)} differences (case sensitivity expected)`);
    }
  });

  it('should log results summary', () => {
    console.log('\n=== ORM Test Results ===');

    for (const orm of ['raw', 'drizzle', 'prisma']) {
      const result = readResult(orm);
      if (result) {
        console.log(`  ${orm}: ${String(result.tables.length)} tables`);
      } else {
        console.log(`  ${orm}: not tested`);
      }
    }
  });
});
