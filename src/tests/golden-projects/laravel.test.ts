import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import { validateSchemaInfo } from '@/utils/schemaInfoValidator.ts';
import masterSchemaJson from '../../../files/Schemas/Master Schema with Multiple User Types.json';

const mockFormData: IFormStore = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'Laravel',
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

const validationResult = validateSchemaInfo(masterSchemaJson);
if (!validationResult.success) {
  const errorMessages = validationResult.errors
    ? validationResult.errors.map((e) => `${e.path}: ${e.message}`).join(', ')
    : 'Unknown validation error';
  throw new Error(`Invalid master schema: ${errorMessages}`);
}
const masterSchema: ISchemaInfo[] = validationResult.data ?? [];

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

function findFolder(structure: IStructure, name: string): IFolder | undefined {
  for (const item of structure) {
    if (item.type === 'folder' && item.name === name) {
      return item;
    }
    if (item.type === 'folder') {
      const nested = findFolder(item.children, name);
      if (nested) {
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
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

describe('Laravel Project Generation', () => {
  const filesDir = path.resolve(__dirname, '../../../files');
  const outputDir = '/tmp/golden-projects-output/laravel';

  beforeAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  });

  it('should generate Laravel project without format errors', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Laravel/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    expect(result.structure.length).toBeGreaterThan(0);
    expect(result.filesFailedToFormat).toHaveLength(0);

    writeStructureToDisk(result.structure, outputDir);
  }, 30000);

  it('should generate api-test.sh like other frameworks', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Laravel/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    const apiTest = findFile(result.structure, 'api-test.sh');
    expect(apiTest).toBeDefined();
    expect(apiTest?.content).toContain('Auto-generated API Test Script');
    expect(apiTest?.content).toContain('/auth/register');
    expect(apiTest?.content).toContain('/auth/login');
  }, 30000);

  it('should generate relationship routes for master schema', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Laravel/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    const routesFolder = findFolder(result.structure, 'routes');
    expect(routesFolder).toBeDefined();

    const usersRoutes = findFile(routesFolder?.children ?? [], 'users.php');
    const ordersRoutes = findFile(routesFolder?.children ?? [], 'orders.php');
    expect(usersRoutes).toBeDefined();
    expect(ordersRoutes).toBeDefined();

    expect(usersRoutes?.content).toContain('users/{id}/profile');
    expect(usersRoutes?.content).toContain('users/{id}/posts');
    expect(usersRoutes?.content).toContain('users/get-all-with-related-posts');
    expect(ordersRoutes?.content).toContain('orders/{id}/products');
  }, 30000);

  it('should not leave unprocessed template syntax in output', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Laravel/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    const binaryExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.ico',
      '.webp',
      '.svg',
      '.woff',
      '.woff2',
      '.ttf',
      '.eot',
      '.pdf',
    ];
    const isBinaryFile = (name: string): boolean =>
      binaryExtensions.some((ext) => name.toLowerCase().endsWith(ext));
    const templateVariablePattern = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/;

    const check = (items: IStructure): void => {
      for (const item of items) {
        if (item.type === 'file') {
          if (isBinaryFile(item.name)) {
            continue;
          }
          expect(templateVariablePattern.exec(item.content)).toBeNull();
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
  }, 30000);
});
