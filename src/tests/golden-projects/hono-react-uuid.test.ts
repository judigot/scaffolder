/**
 * Proven live BUILD_FAILED: hono-react uuid user.id + session.userId.
 * Format-check must pass with valid drizzle uuid columns, typed interfaces,
 * and no leftover auth placeholders.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import { parseCompactSchema } from '@/utils/schemaInfoValidator.ts';
import { honoReactSchemaFilter } from '@/tests/helpers/honoReactAgentSchema.ts';

const LIVE_HONO_REACT_UUID_SCHEMA = `<@@SCHEMA@@>
@user:id:u#pk,email:s!u,hashed_password:s,createdAt:D,updatedAt:D|>session
@session:id:s#pk,userId:u>user,expiresAt:D|<user
<@@/SCHEMA@@>`;

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
  if (!fs.existsSync(dirPath)) {
    return items;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith('.test.ts') || entry.name === 'output') {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      items.push(createFolder(entry.name, loadDirectoryAsStructure(fullPath)));
    } else if (entry.isFile()) {
      items.push(createFile(entry.name, fs.readFileSync(fullPath, 'utf-8')));
    }
  }
  return items;
}

function findFileByPath(
  structure: IStructure,
  segments: string[],
): IFile | undefined {
  let current: IStructure = structure;
  for (const [index, segment] of segments.entries()) {
    const isLast = index === segments.length - 1;
    const match = current.find((item) => item.name === segment);
    if (!match) {
      return undefined;
    }
    if (isLast) {
      return match.type === 'file' ? match : undefined;
    }
    if (match.type !== 'folder') {
      return undefined;
    }
    current = match.children;
  }
  return undefined;
}

function collectFileContents(structure: IStructure): IFile[] {
  const files: IFile[] = [];
  for (const item of structure) {
    if (item.type === 'file') {
      files.push(item);
    } else {
      files.push(...collectFileContents(item.children));
    }
  }
  return files;
}

describe('Hono-React uuid schema generation', () => {
  const filesDir = path.resolve(__dirname, '../../../files');
  const parsedSchema = parseCompactSchema(LIVE_HONO_REACT_UUID_SCHEMA);

  it('parses the live compact uuid schema', () => {
    expect(parsedSchema).not.toBeNull();
    expect(isISchemaInfoArray(parsedSchema)).toBe(true);
  });

  it('keeps the hono-react $SCHEMA_FILTER on uuid user.id and session.userId', () => {
    const structureYaml = fs.readFileSync(
      path.join(filesDir, 'Projects/hono-react/structure.yaml'),
      'utf-8',
    );
    expect(structureYaml).toContain("$SCHEMA_FILTER:");
    for (const filter of honoReactSchemaFilter) {
      expect(structureYaml).toContain(`- '${filter}'`);
    }
    expect(structureYaml).not.toContain('user.id.data_type=number');
  });

  it(
    'generates format-check-clean uuid drizzle, interfaces, and auth routes',
    { timeout: 60000 },
    async () => {
      expect(parsedSchema).not.toBeNull();
      if (!isISchemaInfoArray(parsedSchema)) {
        throw new Error('Live compact uuid schema is not ISchemaInfo[]');
      }

      const result = await buildProjectFiles(
        '/Projects/hono-react/structure.yaml',
        loadDirectoryAsStructure(filesDir),
        parsedSchema,
        mockFormData,
        null,
      );

      expect(result.filesFailedToFormat).toEqual([]);

      const schemaFile = findFileByPath(result.structure, [
        'api',
        'db',
        'schema.ts',
      ]);
      expect(schemaFile).toBeDefined();
      const schemaContent = schemaFile?.content ?? '';
      expect(schemaContent).toContain("uuid('id')");
      expect(schemaContent).toContain("uuid('userId')");
      expect(schemaContent).toMatch(/id:\s*uuid\('id'\)\.primaryKey\(\)/);
      expect(schemaContent).toMatch(/userId:\s*uuid\('userId'\)/);
      expect(schemaContent).not.toMatch(/:\s*\.notNull\(\)/);
      expect(schemaContent).not.toContain('bigserial(\'id\'');
      expect(schemaContent).toContain('from \'drizzle-orm/pg-core\'');
      expect(schemaContent).toMatch(/\buuid\b/);

      const userInterface = findFileByPath(result.structure, [
        'src',
        'interfaces',
        'IUser.ts',
      ]);
      expect(userInterface).toBeDefined();
      expect(userInterface?.content).toMatch(/id:\s*string;/);
      expect(userInterface?.content).not.toMatch(/id:\s*;/);

      const sessionInterface = findFileByPath(result.structure, [
        'src',
        'interfaces',
        'ISession.ts',
      ]);
      expect(sessionInterface).toBeDefined();
      expect(sessionInterface?.content).toMatch(/userId:\s*string;/);
      expect(sessionInterface?.content).not.toMatch(/userId:\s*;/);

      const authFile = findFileByPath(result.structure, [
        'api',
        'routes',
        'auth.ts',
      ]);
      expect(authFile).toBeDefined();
      expect(authFile?.content).not.toContain('<@@>');
      expect(authFile?.content).not.toContain('</@@>');
      expect(authFile?.content).not.toContain('userUsernameColumnCamelCase');
      expect(authFile?.content).not.toContain('userFirstNameColumnCamelCase');
      expect(authFile?.content).not.toContain('userLastNameColumnCamelCase');

      const leftoverPlaceholder = collectFileContents(result.structure).filter(
        (file) =>
          file.content.includes('<@@>') || file.content.includes('</@@>'),
      );
      expect(leftoverPlaceholder.map((file) => file.name)).toEqual([]);
    },
  );
});
