/**
 * Project Generator for Runtime Tests
 *
 * Generates a project using the scaffolder and writes it to disk.
 * Usage: bun run generate-project.ts <output-dir>
 */

import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { isISchemaInfoArray } from '@/interfaces/interfaces.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Use Master Schema with Multiple User Types for comprehensive coverage
import masterSchemaJson from '@/../files/Schemas/Master Schema with Multiple User Types.json';

// Validate JSON matches expected shape at runtime
if (!isISchemaInfoArray(masterSchemaJson)) {
  throw new Error('Invalid master schema JSON structure');
}
const masterSchema = masterSchemaJson;

const OUTPUT_DIR = process.argv[2] ?? '/tmp/golden-runtime-test';
const TEST_PORT = process.argv[3] ?? '3999';

// Type-safe factory functions for IStructure items
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

async function main(): Promise<void> {
  const filesDir = path.resolve(__dirname, '../../../files');
  const userFiles = loadDirectoryAsStructure(filesDir);

  const mockFormData: IFormStore = {
    backendUrl: `http://localhost:${TEST_PORT}`,
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

  console.log(`Generating project to: ${OUTPUT_DIR}`);

  const result = await buildProjectFiles(
    '/Projects/hono-react/structure.yaml',
    userFiles,
    masterSchema,
    mockFormData,
    null,
  );

  if (result.filesFailedToFormat.length > 0) {
    console.error('Files failed to format:', result.filesFailedToFormat);
    process.exit(1);
  }

  // Clean and create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeStructureToDisk(result.structure, OUTPUT_DIR);
  console.log(`Generated ${String(result.structure.length)} top-level items`);
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
