import { buildProjectFiles } from '../src/utils/project-builder/buildProjectFiles.ts';
import convertLocalFilesToIStructure from '../src/utils/convertLocalFilesToIStructure.ts';
import oneToMany from '../src/schema-infos/oneToMany.ts';
import type { IFormStore } from '../src/useFormStore.ts';
import type {
  IStructure,
  IFile,
  IFolder,
} from '../src/components/FileViewer.tsx';
import * as fs from 'node:fs';
import * as path from 'node:path';

const formData: IFormStore = {
  schemaInput: '',
  backendUrl: 'http://localhost:3001',
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  framework: 'express',
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: false,
  outputOnSingleFile: false,
  dbType: 'postgresql',
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: 'schemaBuilder',
  dbUsername: '',
  dbPassword: '',
  dbHost: '',
  dbPort: 5432,
  dbName: '',
  setCreationMode: () => {},
  setMasterSchema: () => {},
  setOneToOne: () => {},
  setOneToMany: () => {},
  setManyToMany: () => {},
  setDBType: () => {},
  setPublicRepoURL: () => {},
  setDbConnection: () => {},
};

function writeStructureToFileSystem(
  structure: IStructure,
  basePath: string,
): void {
  for (const item of structure) {
    const itemPath = path.join(basePath, item.name);

    if (item.type === 'folder') {
      fs.mkdirSync(itemPath, { recursive: true });
      writeStructureToFileSystem((item as IFolder).children, itemPath);
    } else {
      const file = item as IFile;
      fs.mkdirSync(path.dirname(itemPath), { recursive: true });
      fs.writeFileSync(itemPath, file.content);
    }
  }
}

async function main() {
  const projectPath = process.argv[2] || 'Express API';
  const outputDir =
    process.argv[3] ||
    `${process.env.HOME || process.env.USERPROFILE}/Desktop/test/express-api`;

  console.log(`Loading user files from 'files/' directory...`);
  const userFiles = convertLocalFilesToIStructure('files');

  console.log(`Generating project: App Generator - ${projectPath}`);
  const result = await buildProjectFiles(
    `/Projects/App Generator - ${projectPath}/structure.yaml`,
    userFiles,
    oneToMany,
    formData,
  );

  if (result.structure.length === 0) {
    console.error('No files generated!');
    process.exit(1);
  }

  console.log(`Writing ${result.structure.length} items to ${outputDir}...`);

  // Clean and create output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // Write generated files
  writeStructureToFileSystem(result.structure, outputDir);

  console.log('✅ Project generated successfully!');
  console.log(`\nNext steps:`);
  console.log(`  cd ${outputDir}`);
  console.log(`  bun install`);
  console.log(`  bun run dev`);
}

main().catch(console.error);
