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
  framework: 'Next.js',
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

describe('App Generator - Next.js golden project', () => {
  const filesDir = path.resolve(__dirname, '../../../files');
  const projectDir = path.join(filesDir, 'Projects/App Generator - Next.js');

  it('is registered as a runtime golden', () => {
    const goldenPath = path.join(projectDir, '.golden');
    expect(fs.existsSync(goldenPath)).toBe(true);
    const content = fs.readFileSync(goldenPath, 'utf-8');
    expect(content).toContain('framework=Next.js');
    expect(content).toContain('skipMigrate=true');
    expect(content).toContain('parity=false');
    expect(content).toContain('dockerfile=Dockerfile.dev');
  });

  it('composes Next.js App Router with Drizzle', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Next.js/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    expect(result.hasErrors).toBeFalsy();
    expect(result.filesFailedToFormat).toHaveLength(0);
    expect(result.structure.length).toBeGreaterThan(0);

    const rootPackageJson = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'package.json',
    );
    expect(rootPackageJson?.content).toContain('"next"');
    expect(rootPackageJson?.content).toContain('"dev:api"');
    expect(rootPackageJson?.content).toContain('"drizzle-orm"');
    expect(rootPackageJson?.content).not.toContain('"@prisma/client"');
    expect(rootPackageJson?.content).not.toContain('"prisma"');

    const vercelJson = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'vercel.json',
    );
    expect(vercelJson?.content).toContain('"framework": "nextjs"');

    expect(findFolder(result.structure, 'pages')).toBeUndefined();
    expect(findFolder(result.structure, 'prisma')).toBeUndefined();
    expect(findFile(result.structure, 'middleware.ts')).toBeUndefined();

    const appFolder = findFolder(result.structure, 'app');
    expect(appFolder).toBeDefined();
    const apiFolder = findFolder(appFolder?.children ?? [], 'api');
    expect(apiFolder).toBeDefined();

    const healthRoute = getAtPath(result.structure, [
      'app',
      'api',
      'health',
      'route.ts',
    ]);
    expect(healthRoute?.type).toBe('file');
    if (healthRoute?.type === 'file') {
      expect(healthRoute.content).toContain("status: 'healthy'");
      expect(healthRoute.content).toContain('export function GET');
      expect(healthRoute.content).not.toContain('NextApiRequest');
    }

    const helloRoute = getAtPath(result.structure, [
      'app',
      'api',
      'hello',
      'route.ts',
    ]);
    expect(helloRoute?.type).toBe('file');
    if (helloRoute?.type === 'file') {
      expect(helloRoute.content).toContain('Hello, world!');
    }

    const schemaFile = getAtPath(result.structure, ['api', 'db', 'schema.ts']);
    expect(schemaFile?.type).toBe('file');
    if (schemaFile?.type === 'file') {
      expect(schemaFile.content).toContain('pgTable');
      expect(schemaFile.content).not.toContain('@LOOP');
    }

    const authHook = getAtPath(result.structure, ['lib', 'auth.ts']);
    expect(authHook?.type).toBe('file');
    if (authHook?.type === 'file') {
      expect(authHook.content).toContain('getAuthSession');
      expect(authHook.content).toContain('getBetterAuth');
    }

    const betterAuthFactory = getAtPath(result.structure, [
      'api',
      'auth',
      'better-auth.ts',
    ]);
    expect(betterAuthFactory?.type).toBe('file');

    const authRoute = getAtPath(result.structure, [
      'app',
      'api',
      'auth',
      '[...all]',
      'route.ts',
    ]);
    expect(authRoute?.type).toBe('file');
    if (authRoute?.type === 'file') {
      expect(authRoute.content).toContain('handler(request)');
      expect(authRoute.content).not.toContain('NextApiRequest');
    }

    const authClient = getAtPath(result.structure, [
      'src',
      'lib',
      'auth-client.ts',
    ]);
    expect(authClient?.type).toBe('file');
    if (authClient?.type === 'file') {
      expect(authClient.content).toContain('createAuthClient');
      expect(authClient.content).not.toContain('import.meta.env');
    }

    const layout = findFile(result.structure, 'layout.tsx');
    expect(layout?.content).toContain('RootLayout');

    expect(findFile(result.structure, 'next.config.ts')).toBeDefined();

    const rootApiTest = result.structure.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === 'api-test.sh',
    );
    expect(rootApiTest?.content).toContain('/health');
    expect(rootApiTest?.content).toContain('Passed:');
    expect(rootApiTest?.content).not.toContain('/auth/register');

    expect(
      result.structure.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === 'Dockerfile.dev',
      ),
    ).toBeDefined();
  }, 60000);

  it('generates App Router collection and item routes without Pages Router APIs', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Next.js/structure.yaml',
      userFiles,
      masterSchema,
      mockFormData,
      null,
    );

    const usersCollection = getAtPath(result.structure, [
      'app',
      'api',
      'user',
      'route.ts',
    ]);
    const usersById = getAtPath(result.structure, [
      'app',
      'api',
      'user',
      '[id]',
      'route.ts',
    ]);

    expect(usersCollection?.type).toBe('file');
    expect(usersById?.type).toBe('file');
    if (usersCollection?.type === 'file') {
      expect(usersCollection.content).toContain('export async function GET');
      expect(usersCollection.content).toContain('export async function POST');
      expect(usersCollection.content).toContain("from '@/api/db'");
      expect(usersCollection.content).not.toContain('NextApiRequest');
      expect(usersCollection.content).not.toContain('prisma');
    }
    if (usersById?.type === 'file') {
      expect(usersById.content).toContain('await context.params');
      expect(usersById.content).toContain('export async function PATCH');
      expect(usersById.content).toContain('export async function DELETE');
      expect(usersById.content).not.toContain('NextApiRequest');
    }
  }, 60000);

  it('does not leave unprocessed template syntax in output', async () => {
    const userFiles = loadDirectoryAsStructure(filesDir);
    const result = await buildProjectFiles(
      '/Projects/App Generator - Next.js/structure.yaml',
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
