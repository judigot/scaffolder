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

describe('template-monorepo golden project', () => {
  const filesDir = path.resolve(__dirname, '../../../files');
  const projectDir = path.join(filesDir, 'Projects/template-monorepo');

  it('is registered as a runtime golden', () => {
    const goldenPath = path.join(projectDir, '.golden');
    expect(fs.existsSync(goldenPath)).toBe(true);
    const content = fs.readFileSync(goldenPath, 'utf-8');
    expect(content).toContain('framework=hono');
    expect(content).toContain('skipMigrate=true');
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
    const rootTurbo = result.structure.find(
      (item): item is IFile => item.type === 'file' && item.name === 'turbo.json',
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

    const healthRoute = findFile(result.structure, 'health.ts');
    expect(healthRoute?.content).toContain("status: 'healthy'");

    expect(rootApiTest).toBeDefined();
    expect(rootApiTest?.content).toContain('/health');
    expect(rootApiTest?.content).toContain('Passed:');
    expect(rootApiTest?.content).toContain('Failed:');
    expect(rootApiTest?.content).not.toContain('/auth/register');

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
