/**
 * Golden Test: Hono-React Project Generation
 *
 * Tests the hono-react project template against multiple schemas.
 * Generates actual files to disk for inspection.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer';
import type { IFormStore } from '@/useFormStore';
import type { ISchemaInfo } from '@/interfaces/interfaces';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Import available schemas
import oneToOneSchema from '@/schema-infos/oneToOne';
import oneToManySchema from '@/schema-infos/oneToMany';
import manyToManySchema from '@/schema-infos/manyToMany';
import masterSchema from '@/schema-infos/masterSchema';

// Mock form data
const mockFormData: Partial<IFormStore> = {
  backendUrl: 'http://localhost:3000',
  dbType: 'postgresql',
  framework: 'hono',
};

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
      items.push({
        type: 'folder',
        name: entry.name,
        children: loadDirectoryAsStructure(fullPath),
      });
    } else if (entry.isFile()) {
      items.push({
        type: 'file',
        name: entry.name,
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
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

// Schema test cases
const schemaTestCases: { name: string; schema: ISchemaInfo[] }[] = [
  { name: 'oneToOne', schema: oneToOneSchema },
  { name: 'oneToMany', schema: oneToManySchema },
  { name: 'manyToMany', schema: manyToManySchema },
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

  describe.each(schemaTestCases)(
    'with $name schema',
    ({ name, schema }) => {
      const outputDir = path.join(outputBaseDir, name);

      it('should generate and write files to disk', async () => {
        const userFiles = loadDirectoryAsStructure(filesDir);

        const result = await buildProjectFiles(
          '/Projects/hono-react/structure.yaml',
          userFiles,
          schema,
          mockFormData as IFormStore,
          null,
        );

        if (result.filesFailedToFormat.length > 0) {
          console.log(`[${name}] Files failed to format:`, result.filesFailedToFormat);
        }

        expect(result.structure.length).toBeGreaterThan(0);
        expect(result.filesFailedToFormat).toHaveLength(0);

        // Write generated files to disk
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true });
        }
        fs.mkdirSync(outputDir, { recursive: true });
        writeStructureToDisk(result.structure, outputDir);
      });

      it('should generate db schema with all tables', async () => {
        const userFiles = loadDirectoryAsStructure(filesDir);

        const result = await buildProjectFiles(
          '/Projects/hono-react/structure.yaml',
          userFiles,
          schema,
          mockFormData as IFormStore,
          null,
        );

        const apiFolder = result.structure.find(
          (item): item is IFolder =>
            item.type === 'folder' && item.name === 'api',
        );
        const dbFolder = apiFolder?.children.find(
          (item): item is IFolder =>
            item.type === 'folder' && item.name === 'db',
        );
        const schemaFile = dbFolder?.children.find(
          (item): item is IFile =>
            item.type === 'file' && item.name === 'schema.ts',
        );

        expect(schemaFile).toBeDefined();

        // Should contain a pgTable export for each table in schema
        for (const table of schema) {
          expect(schemaFile?.content).toContain(
            `pgTable('${table.tableName}'`,
          );
        }

        // Should not contain unprocessed template syntax
        expect(schemaFile?.content).not.toContain('@LOOP(tables)');
        expect(schemaFile?.content).not.toContain('@/LOOP');
        expect(schemaFile?.content).not.toContain('{{tableName}}');
      });

      it('should generate route files for each table', async () => {
        const userFiles = loadDirectoryAsStructure(filesDir);

        const result = await buildProjectFiles(
          '/Projects/hono-react/structure.yaml',
          userFiles,
          schema,
          mockFormData as IFormStore,
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

        // Should have a route file for each table (singular name)
        expect(routeFiles?.length).toBe(schema.length);
      });

      it('should generate test files for each table', async () => {
        const userFiles = loadDirectoryAsStructure(filesDir);

        const result = await buildProjectFiles(
          '/Projects/hono-react/structure.yaml',
          userFiles,
          schema,
          mockFormData as IFormStore,
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
      });

      it('should process templates without leftover syntax', async () => {
        const userFiles = loadDirectoryAsStructure(filesDir);

        const result = await buildProjectFiles(
          '/Projects/hono-react/structure.yaml',
          userFiles,
          schema,
          mockFormData as IFormStore,
          null,
        );

        // Check all generated files for unprocessed template syntax
        const checkForTemplateSyntax = (items: IStructure): void => {
          for (const item of items) {
            if (item.type === 'file') {
              expect(item.content).not.toContain('{{');
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
      });
    },
  );
});
