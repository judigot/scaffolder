import { buildProjectFiles } from '../src/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import type { IFormStore } from '../src/useFormStore.ts';
import { frameworks } from '../src/useFormStore.ts';
import { CREATION_MODES } from '../src/constants.ts';
import oneToMany from '../src/schema-infos/oneToMany.ts';
import masterJSONSchema from '../src/json-schemas/masterJSONSchema.ts';
import type {
  IStructure,
  IFile,
  IFolder,
} from '../src/components/FileViewer.tsx';
import * as fs from 'node:fs';
import * as path from 'node:path';

const outputDir = process.argv[2] || 'C:/Users/Jude/Desktop/test/express-api';

const formData: IFormStore = {
  schemaInput: masterJSONSchema,
  backendUrl: 'http://localhost:5000',
  backendDir: outputDir,
  frontendDir: `${outputDir}/frontend`,
  dbConnection: 'postgresql://user:pass@localhost:5432/db',
  framework: frameworks.EXPRESS,
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: true,
  outputOnSingleFile: false,
  dbType: 'postgresql',
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: CREATION_MODES.SCHEMA_BUILDER,
  dbUsername: 'user',
  dbPassword: 'pass',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: 'db',
  setCreationMode: (): void => {},
  setMasterSchema: (): void => {},
  setOneToOne: (): void => {},
  setOneToMany: (): void => {},
  setManyToMany: (): void => {},
  setDBType: (): void => {},
  setPublicRepoURL: (): void => {},
  setDbConnection: (): void => {},
};

function writeStructureToDisk(structure: IStructure, basePath: string): void {
  for (const item of structure) {
    const itemPath = path.join(basePath, item.name);

    if (item.type === 'file') {
      const file = item as IFile;
      fs.mkdirSync(path.dirname(itemPath), { recursive: true });
      if (file.isBinary === true) {
        fs.writeFileSync(itemPath, Buffer.from(file.content, 'base64'));
      } else {
        fs.writeFileSync(itemPath, file.content, 'utf-8');
      }
      console.log(`  Created: ${itemPath}`);
    } else {
      const folder = item as IFolder;
      fs.mkdirSync(itemPath, { recursive: true });
      writeStructureToDisk(folder.children, itemPath);
    }
  }
}

async function main(): Promise<void> {
  console.log('Loading scaffolder files...');
  const userFiles = convertLocalFilesToIStructure('files');

  console.log('Building Express API project...');
  const result = await buildProjectFiles(
    '/Projects/App Generator - Express API/structure.yaml',
    userFiles,
    oneToMany,
    formData,
  );

  if (result.structure.length === 0) {
    console.error('No files generated!');
    process.exit(1);
  }

  const errorFile = result.structure.find(
    (f) => f.type === 'file' && f.name.endsWith('.log'),
  );
  if (errorFile && errorFile.type === 'file') {
    console.error('Generation failed:');
    console.error(errorFile.content);
    process.exit(1);
  }

  console.log(`\nWriting ${result.structure.length} items to ${outputDir}...`);
  fs.mkdirSync(outputDir, { recursive: true });
  writeStructureToDisk(result.structure, outputDir);

  console.log('\nGeneration complete!');
  console.log(`Output directory: ${outputDir}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
