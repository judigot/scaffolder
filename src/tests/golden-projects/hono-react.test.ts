/**
 * Golden Test: Hono-React Project Generation
 *
 * Tests the hono-react project template against multiple schemas.
 * Generates actual files to disk for inspection.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Load and validate the schema from files/Schemas/ as this is what users would actually use
import { validateSchemaInfo } from '@/utils/schemaInfoValidator.ts';
import masterSchemaJson from '../../../files/Schemas/Master Schema with Multiple User Types.json';

// Mock form data - fully typed
const mockFormData: IFormStore = {
  backendUrl: 'http://localhost:3000',
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

// Type-safe factory functions for IStructure items
function createFile(name: string, content: string): IFile {
  return { type: 'file', name, content };
}

function createFolder(name: string, children: IStructure): IFolder {
  return { type: 'folder', name, children };
}

/**
 * Recursively loads a directory into IStructure format
 */
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

/**
 * Recursively writes IStructure to disk
 */
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

// Validate the JSON schema using Zod-based validator
const validationResult = validateSchemaInfo(masterSchemaJson);
if (!validationResult.success) {
  const errorMessages = validationResult.errors
    ? validationResult.errors.map((e) => `${e.path}: ${e.message}`).join(', ')
    : 'Unknown validation error';
  throw new Error(`Invalid master schema: ${errorMessages}`);
}
// Use the validated data - the validator returns ISchemaInfo-compatible data
// Our ISchemaInfo interface extends the base type with optional auth fields (isAuthResource, ownerField)
const masterSchema: ISchemaInfo[] = validationResult.data ?? [];

// Schema test cases - using only the comprehensive master schema from files/Schemas/
const schemaTestCases: { name: string; schema: ISchemaInfo[] }[] = [
  { name: 'masterSchema', schema: masterSchema },
];

describe('Hono-React Project Generation', () => {
  const filesDir = path.resolve(__dirname, '../../../files');
  const outputBaseDir = path.resolve(__dirname, 'output');

  // Clean and create output directory before all tests
  beforeAll(() => {
    if (fs.existsSync(outputBaseDir)) {
      fs.rmSync(outputBaseDir, { recursive: true });
    }
    fs.mkdirSync(outputBaseDir, { recursive: true });
  });

  it('should load the project template files', () => {
    const userFiles = loadDirectoryAsStructure(filesDir);

    const projectsFolder = userFiles.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === 'Projects',
    );
    expect(projectsFolder).toBeDefined();

    const honoReactFolder = projectsFolder?.children.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === 'hono-react',
    );
    expect(honoReactFolder).toBeDefined();
    expect(
      honoReactFolder?.children.some((c) => c.name === 'structure.yaml'),
    ).toBe(true);
    expect(honoReactFolder?.children.some((c) => c.name === 'templates')).toBe(
      true,
    );
  });

  describe.each(schemaTestCases)('with $name schema', ({ name, schema }) => {
    const outputDir = path.join(outputBaseDir, name);

    it(
      'should generate and write files to disk',
      { timeout: 30000 },
      async () => {
        const userFiles = loadDirectoryAsStructure(filesDir);

        const result = await buildProjectFiles(
          '/Projects/hono-react/structure.yaml',
          userFiles,
          schema,
          mockFormData,
          null,
        );

        if (result.filesFailedToFormat.length > 0) {
          console.log(
            `[${name}] Files failed to format:`,
            result.filesFailedToFormat,
          );
        }

        expect(result.structure.length).toBeGreaterThan(0);
        expect(result.filesFailedToFormat).toHaveLength(0);

        // Write generated files to disk
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true });
        }
        fs.mkdirSync(outputDir, { recursive: true });
        writeStructureToDisk(result.structure, outputDir);
      },
    );

    it('should generate db schema with all tables', async () => {
      const userFiles = loadDirectoryAsStructure(filesDir);

      const result = await buildProjectFiles(
        '/Projects/hono-react/structure.yaml',
        userFiles,
        schema,
        mockFormData,
        null,
      );

      const apiFolder = result.structure.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'api',
      );
      const dbFolder = apiFolder?.children.find(
        (item): item is IFolder => item.type === 'folder' && item.name === 'db',
      );
      const schemaFile = dbFolder?.children.find(
        (item): item is IFile =>
          item.type === 'file' && item.name === 'schema.ts',
      );

      expect(schemaFile).toBeDefined();

      // Should contain a pgTable export for each table in schema
      for (const table of schema) {
        expect(schemaFile?.content).toContain(`pgTable('${table.tableName}'`);
      }

      // Should not contain unprocessed template syntax
      expect(schemaFile?.content).not.toContain('@LOOP(tables)');
      expect(schemaFile?.content).not.toContain('@/LOOP');
      expect(schemaFile?.content).not.toContain('{{tableName}}');
    }, 30000);

    it('should generate route files for each table', async () => {
      const userFiles = loadDirectoryAsStructure(filesDir);

      const result = await buildProjectFiles(
        '/Projects/hono-react/structure.yaml',
        userFiles,
        schema,
        mockFormData,
        null,
      );

      const apiFolder = result.structure.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'api',
      );
      const routesFolder = apiFolder?.children.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'routes',
      );

      expect(routesFolder).toBeDefined();

      const routeFiles = routesFolder?.children.filter(
        (item): item is IFile => item.type === 'file',
      );

      // Should have a route file for each table (singular name) + auth.ts
      expect(routeFiles?.length).toBe(schema.length + 1);
    }, 30000);

    it('should generate test files for each table', async () => {
      const userFiles = loadDirectoryAsStructure(filesDir);

      const result = await buildProjectFiles(
        '/Projects/hono-react/structure.yaml',
        userFiles,
        schema,
        mockFormData,
        null,
      );

      const testsFolder = result.structure.find(
        (item): item is IFolder =>
          item.type === 'folder' && item.name === 'tests',
      );

      expect(testsFolder).toBeDefined();

      const testFiles = testsFolder?.children.filter(
        (item): item is IFile =>
          item.type === 'file' && item.name.endsWith('.test.ts'),
      );

      // Should have a test file for each table
      expect(testFiles?.length).toBe(schema.length);
    }, 30000);

    it('should process templates without leftover syntax', async () => {
      const userFiles = loadDirectoryAsStructure(filesDir);

      const result = await buildProjectFiles(
        '/Projects/hono-react/structure.yaml',
        userFiles,
        schema,
        mockFormData,
        null,
      );

      // Check all generated files for unprocessed template syntax
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

      // Regex to match template variables like {{variableName}} but not JS object literals like {{ auth }}
      // Template variables have no spaces: {{tableName}}, {{columnName}}
      // JS object shorthand has spaces: {{ auth }}, {{ user }}
      const templateVariablePattern = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/;

      const checkForTemplateSyntax = (items: IStructure): void => {
        for (const item of items) {
          if (item.type === 'file') {
            if (isBinaryFile(item.name)) {
              continue;
            }
            // Check for unprocessed template variables (no spaces inside braces)
            const templateMatch = templateVariablePattern.exec(item.content);
            expect(templateMatch).toBeNull();
            expect(item.content).not.toContain('[[ LOOP');
            expect(item.content).not.toContain('@LOOP');
            expect(item.content).not.toContain('<@@LOOP@@');
            expect(item.content).not.toContain('{% IF');
          } else {
            checkForTemplateSyntax(item.children);
          }
        }
      };

      checkForTemplateSyntax(result.structure);
    }, 30000);
  });
});
