/**
 * Project Generator for Runtime Tests
 *
 * Generates a project using the scaffolder and writes it to disk.
 * Usage: bun run generate-project.ts <output-dir>
 */

import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer';
import type { IFormStore } from '@/useFormStore';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Use Master Schema with Multiple User Types for comprehensive coverage
import masterSchema from '@/../files/Schemas/Master Schema with Multiple User Types.json';

const OUTPUT_DIR = process.argv[2] || '/tmp/golden-runtime-test';
const TEST_PORT = process.argv[3] || '3999';

function loadDirectoryAsStructure(dirPath: string): IStructure {
  const items: IStructure = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      items.push({
        type: 'folder',
        name: entry.name,
        children: loadDirectoryAsStructure(fullPath),
      } as IFolder);
    } else {
      items.push({
        type: 'file',
        name: entry.name,
        content: fs.readFileSync(fullPath, 'utf-8'),
      } as IFile);
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

async function main() {
  const filesDir = path.resolve(__dirname, '../../../files');
  const userFiles = loadDirectoryAsStructure(filesDir);

  const mockFormData: Partial<IFormStore> = {
    backendUrl: `http://localhost:${TEST_PORT}`,
    dbType: 'postgresql',
    framework: 'hono',
  };

  console.log(`Generating project to: ${OUTPUT_DIR}`);

  const result = await buildProjectFiles(
    '/Projects/hono-react/structure.yaml',
    userFiles,
    masterSchema,
    mockFormData as IFormStore,
    null
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
  console.log(`Generated ${result.structure.length} top-level items`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
