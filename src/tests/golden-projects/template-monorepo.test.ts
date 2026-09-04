import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import { validateSchemaInfo } from '@/utils/schemaInfoValidator.ts';
import masterSchemaJson from '../../../files/Schemas/Master Schema with Multiple User Types.json';

const validationResult = validateSchemaInfo(masterSchemaJson);
if (!validationResult.success) {
  const errorMessages = validationResult.errors
    ? validationResult.errors.map((e) => `${e.path}: ${e.message}`).join(', ')
    : 'Unknown validation error';
  throw new Error(`Invalid master schema: ${errorMessages}`);
}
const masterSchema: ISchemaInfo[] = validationResult.data ?? [];

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
  setCreationMode: () => {
    return;
  },
  setMasterSchema: () => {
    return;
  },
  setOneToOne: () => {
    return;
  },
  setOneToMany: () => {
    return;
  },
  setManyToMany: () => {
    return;
  },
  setDBType: () => {
    return;
  },
  setPublicRepoURL: () => {
    return;
  },
  setDbConnection: () => {
    return;
  },
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
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      items.push(createFolder(entry.name, loadDirectoryAsStructure(fullPath)));
    } else if (entry.isFile()) {
      items.push(createFile(entry.name, fs.readFileSync(fullPath, 'utf-8')));
    }
  }
  return items;
}

function findFolder(structure: IStructure, name: string): IFolder | undefined {
  for (const item of structure) {
    if (item.type === 'folder' && item.name === name) {
      return item;
    }
    if (item.type === 'folder') {
      const nested = findFolder(item.children, name);
      if (nested !== undefined) {
        return nested;
      }
    }
  }
  return undefined;
}

function findFile(structure: IStructure, name: string): IFile | undefined {
  for (const item of structure) {
    if (item.type === 'file' && item.name === name) {
      return item;
    }
    if (item.type === 'folder') {
      const nested = findFile(item.children, name);
      if (nested !== undefined) {
        return nested;
      }
    }
  }
  return undefined;
}

function getAtPath(
  structure: IStructure,
  segments: string[],
): IFile | IFolder | undefined {
  let current: IStructure = structure;
  let found: IFile | IFolder | undefined;
  for (const segment of segments) {
    found = current.find((item) => item.name === segment);
    if (found === undefined) {
      return undefined;
    }
    if (found.type === 'folder') {
      current = found.children;
    }
  }
  return found;
}

describe('template-monorepo golden project', () => {
  const filesDir = path.resolve(__dirname, '../../../files');
  const projectDir = path.join(filesDir, 'Projects/template-monorepo');

  it('is registered as a runtime golden', () => {
    const goldenPath = path.join(projectDir, '.golden');
    expect(fs.existsSync(goldenPath)).toBe(true);
    const content = fs.readFileSync(goldenPath, 'utf-8');
    expect(content).toContain('framework=Nest');
    expect(content).toContain('skipMigrate=false');
    expect(content).toContain('parity=false');
    expect(content).toContain('installFilter=@bigbang/api');
    expect(content).toContain('devFilter=@bigbang/api');
  });

  it('generates the vendored monorepo layout without format errors', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/template-monorepo/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    expect(result.hasErrors).toBeFalsy();
    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);

    const apps = findFolder(result.structure, 'apps');
    expect(apps).toBeDefined();
    expect(findFolder(apps?.children ?? [], 'api')).toBeDefined();
    expect(findFolder(apps?.children ?? [], 'vite')).toBeDefined();
    expect(findFolder(apps?.children ?? [], 'nextjs')).toBeDefined();
    expect(findFolder(result.structure, 'packages')).toBeDefined();
    expect(findFolder(result.structure, 'e2e')).toBeDefined();

    const rootPackageJson = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'package.json',
    );
    expect(rootPackageJson?.content).toContain('"dev:api"');
    expect(rootPackageJson?.content).toContain('"workspaces"');
    const rootDrizzle = result.structure.find(
      (item) => item.type === 'file' && item.name === 'drizzle.config.ts',
    );
    expect(rootDrizzle).toBeUndefined();
    const apiDrizzle = getAtPath(result.structure, [
      'apps',
      'api',
      'drizzle.config.ts',
    ]);
    expect(apiDrizzle?.type).toBe('file');
    if (apiDrizzle?.type === 'file') {
      expect(apiDrizzle.content).toContain('./src/db/schema.ts');
    }
    const rootTurbo = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'turbo.json',
    );
    expect(rootTurbo).toBeDefined();
    const rootApiTest = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'api-test.sh',
    );
    const rootDockerfile = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'Dockerfile.dev',
    );

    const apiPackageJson = getAtPath(result.structure, [
      'apps',
      'api',
      'package.json',
    ]);
    expect(apiPackageJson?.type).toBe('file');
    if (apiPackageJson?.type === 'file') {
      expect(apiPackageJson.content).toContain('"name": "@bigbang/api"');
      expect(apiPackageJson.content).toContain('"@nestjs/core"');
      expect(apiPackageJson.content).toContain('"drizzle-orm"');
      expect(apiPackageJson.content).not.toContain('"hono"');
    }

    const healthController = findFile(result.structure, 'health.controller.ts');
    expect(healthController?.content).toContain('HealthController');
    expect(healthController?.content).toContain("status: 'healthy'");
    expect(findFile(result.structure, 'app.module.ts')?.content).toContain(
      'AppModule',
    );
    expect(findFile(result.structure, 'app.module.ts')?.content).toContain(
      'Module',
    );
    expect(
      findFile(result.structure, 'zod-validation.pipe.ts')?.content,
    ).toContain('ZodValidationPipe');
    expect(findFile(result.structure, 'health.ts')).toBeUndefined();

    const dbIndex = getAtPath(result.structure, [
      'apps',
      'api',
      'src',
      'db',
      'index.ts',
    ]);
    expect(dbIndex?.type).toBe('file');
    if (dbIndex?.type === 'file') {
      expect(dbIndex.content).toContain('getDb');
      expect(dbIndex.content).not.toContain('api/db');
    }
    const dbSchema = getAtPath(result.structure, [
      'apps',
      'api',
      'src',
      'db',
      'schema.ts',
    ]);
    expect(dbSchema?.type).toBe('file');
    if (dbSchema?.type === 'file') {
      expect(dbSchema.content).toContain('pgTable');
    }

    const userController = findFile(result.structure, 'user.controller.ts');
    expect(userController?.content).toContain('UserController');
    expect(userController?.content).toContain("Controller('user')");
    expect(findFile(result.structure, 'user.service.ts')?.content).toContain(
      'UserService',
    );
    expect(findFile(result.structure, 'user.module.ts')?.content).toContain(
      'UserModule',
    );

    expect(rootApiTest).toBeDefined();
    expect(rootApiTest?.content).toContain('/health');
    expect(rootApiTest?.content).toContain('Passed:');
    expect(rootApiTest?.content).toContain('Failed:');
    expect(rootApiTest?.content).toContain('GET /user');
    expect(rootApiTest?.content).not.toContain('/auth/register');

    const rootApiFolder = result.structure.find(
      (item) => item.type === 'folder' && item.name === 'api',
    );
    expect(rootApiFolder).toBeUndefined();

    expect(rootDockerfile).toBeDefined();
  }, 60000);

  it('does not leave unprocessed template syntax in output', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/template-monorepo/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    const templateVariablePattern = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/;
    const check = (items: IStructure): void => {
      for (const item of items) {
        if (item.type === 'file') {
          expect(templateVariablePattern.exec(item.content)).toBeNull();
          expect(item.content).not.toContain('[[USE_');
          expect(item.content).not.toContain('[[ LOOP');
          expect(item.content).not.toContain('@LOOP');
          expect(item.content).not.toContain('<@@LOOP@@');
          expect(item.content).not.toContain('{% IF');
        } else {
          check(item.children);
        }
      }
    };

    check(result.structure);
  }, 60000);
});
