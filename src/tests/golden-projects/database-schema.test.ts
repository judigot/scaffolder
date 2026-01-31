/**
 * App Generator - Database Schema Golden Test
 *
 * This is the most critical golden test as database schema generation
 * is the foundation for all ORM migrations and type generation.
 *
 * Uses character-accurate snapshot comparison to detect any regressions.
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

import masterSchemaJson from '@/../files/Schemas/Master Schema with Multiple User Types.json';

if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}
const masterSchema = masterSchemaJson;

const filesDir = path.resolve(__dirname, '../../../files');
const snapshotsDir = path.resolve(__dirname, './snapshots');

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

describe('App Generator - Database Schema Golden Test', () => {
  let userFiles: IStructure;
  let result: Awaited<ReturnType<typeof buildProjectFiles>>;
  let goldenSnapshot: string;

  beforeAll(async () => {
    userFiles = loadDirectoryAsStructure(filesDir);
    result = await buildProjectFiles(
      '/Projects/App Generator - Database Schema/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );
    goldenSnapshot = fs.readFileSync(
      path.join(snapshotsDir, 'database-schema.sql'),
      'utf-8',
    );
  }, 30000);

  it('should generate schema.sql successfully', () => {
    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);

    const schemaSql = findFileInStructure(result.structure, 'schema.sql');
    expect(schemaSql).not.toBeNull();
  });

  it('should match the golden snapshot exactly', () => {
    const schemaSql = findFileInStructure(result.structure, 'schema.sql');
    expect(schemaSql).not.toBeNull();
    expect(schemaSql).toBe(goldenSnapshot);
  });

  it('should have correct character count', () => {
    const schemaSql = findFileInStructure(result.structure, 'schema.sql');
    expect(schemaSql).not.toBeNull();
    expect(schemaSql?.length).toBe(goldenSnapshot.length);
  });

  describe('Golden Snapshot Verification', () => {
    it('should contain all expected tables', () => {
      const expectedTables = [
        'product',
        'customer',
        'order',
        'order_product',
        'user',
        'profile',
        'session',
        'posts',
        'user_type',
        'user_user_type',
        'oauth_account',
      ];

      for (const table of expectedTables) {
        expect(goldenSnapshot).toContain(`CREATE TABLE "${table}"`);
      }
    });

    it('should have correct primary key types', () => {
      // Numeric primary keys use BIGSERIAL
      expect(goldenSnapshot).toContain('"id" BIGSERIAL PRIMARY KEY');
      // String primary keys (e.g., user table for Lucia auth) use TEXT
      expect(goldenSnapshot).toContain('"id" TEXT PRIMARY KEY');
    });

    it('should have BIGINT for some foreign keys', () => {
      expect(goldenSnapshot).toContain('"customer_id" BIGINT NOT NULL');
      expect(goldenSnapshot).toContain('"order_id" BIGINT NOT NULL');
      expect(goldenSnapshot).toContain('"product_id" BIGINT NOT NULL');
    });

    it('should have VARCHAR(255) for email', () => {
      expect(goldenSnapshot).toContain('"email" VARCHAR(255) UNIQUE NOT NULL');
    });

    it('should have TIMESTAMPTZ for timestamps', () => {
      expect(goldenSnapshot).toContain(
        '"created_at" TIMESTAMPTZ (6) DEFAULT NOW ()',
      );
      expect(goldenSnapshot).toContain(
        '"updated_at" TIMESTAMPTZ (6) DEFAULT NOW ()',
      );
    });

    it('should have foreign key constraints', () => {
      expect(goldenSnapshot).toContain('CONSTRAINT "FK_');
      expect(goldenSnapshot).toContain('FOREIGN KEY');
      expect(goldenSnapshot).toContain('REFERENCES');
    });

    it('should have DROP TABLE statements', () => {
      expect(goldenSnapshot).toContain('DROP TABLE IF EXISTS');
    });
  });
});
