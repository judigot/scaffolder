import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { CREATION_MODES } from '@/constants.ts';
import masterJSONSchema from '@/json-schemas/masterJSONSchema.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import type { IStructure } from '@/components/FileViewer.tsx';

const createFormData = (): IFormStore => ({
  schemaInput: masterJSONSchema,
  backendUrl: 'http://localhost:5000',
  backendDir: 'C:/Users/Jude/Desktop/laravel',
  frontendDir: 'C:/Users/Jude/Desktop/laravel/frontend',
  dbConnection:
    'postgresql://scaffolder:scaffolder123@localhost:15432/scaffolder',
  framework: frameworks.LARAVEL,
  includeInsertData: true,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: true,
  outputOnSingleFile: false,
  dbType: 'postgresql',
  quote: '"',
  publicRepoURL: 'https://github.com/judigot/scaffolder-files',
  clientID: '',
  clientSecret: '',
  creationMode: CREATION_MODES.SCHEMA_BUILDER,
  dbUsername: 'root',
  dbPassword: '123',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: 'laravel',
  // Stub methods required by IFormStore interface
  /* eslint-disable @typescript-eslint/no-empty-function */
  setCreationMode: (): void => {},
  setMasterSchema: (): void => {},
  setOneToOne: (): void => {},
  setOneToMany: (): void => {},
  setManyToMany: (): void => {},
  setDBType: (): void => {},
  setQuote: (): void => {},
  setFramework: (): void => {},
  setBackendUrl: (): void => {},
  setBackendDir: (): void => {},
  setFrontendDir: (): void => {},
  setDbConnection: (): void => {},
  setDBUsername: (): void => {},
  setDBPassword: (): void => {},
  setDBHost: (): void => {},
  setDBPort: (): void => {},
  setDBName: (): void => {},
  setIncludeInsertData: (): void => {},
  setInsertOption: (): void => {},
  setIncludeTypeGuards: (): void => {},
  setOutputOnSingleFile: (): void => {},
  setPublicRepoURL: (): void => {},
  setClientID: (): void => {},
  setClientSecret: (): void => {},
  /* eslint-enable @typescript-eslint/no-empty-function */
});

const createMockUserFiles = (): IStructure => [
  {
    type: 'folder',
    name: 'Projects',
    children: [
      {
        type: 'folder',
        name: 'BadFormatTest',
        children: [
          {
            type: 'file',
            name: 'structure.yaml',
            content:
              'CREATE_FILE(badFormat.ts --template ./templates/badFormat.txt):',
          },
          {
            type: 'folder',
            name: 'templates',
            children: [
              {
                type: 'file',
                name: 'badFormat.txt',
                content:
                  'const arrayOfNumbersVariable: number[] = [1, 2, 3, 4;',
              },
            ],
          },
        ],
      },
      {
        type: 'folder',
        name: 'GoodFormatTest',
        children: [
          {
            type: 'file',
            name: 'structure.yaml',
            content:
              'CREATE_FILE(goodFormat.ts --template ./templates/goodFormat.txt):',
          },
          {
            type: 'folder',
            name: 'templates',
            children: [
              {
                type: 'file',
                name: 'goodFormat.txt',
                content:
                  'const arrayOfNumbersVariable: number[] = [1, 2, 3, 4];',
              },
            ],
          },
        ],
      },
    ],
  },
];

const findFileInStructure = (
  structure: IStructure,
  fileName: string,
): { type: 'file'; name: string; content: string } | null => {
  for (const item of structure) {
    if (item.type === 'file' && item.name === fileName) {
      return item;
    }
    if (item.type === 'folder') {
      const found = findFileInStructure(item.children, fileName);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

describe('Files Failed To Format Tracking', () => {
  it('should track files that failed to format due to syntax errors', async () => {
    const formData = createFormData();
    const userFiles = createMockUserFiles();

    const buildResult = await buildProjectFiles(
      '/Projects/BadFormatTest/structure.yaml',
      userFiles,
      masterSchema,
      formData,
      null,
    );

    expect(buildResult.filesFailedToFormat).toBeDefined();
    expect(Array.isArray(buildResult.filesFailedToFormat)).toBe(true);

    const filesFailedToFormat = buildResult.filesFailedToFormat;

    expect(filesFailedToFormat.length).toBeGreaterThan(0);

    const hasBadFormat = filesFailedToFormat.some(
      (entry) =>
        entry.filePath.includes('badFormat.ts') ||
        entry.filePath === 'badFormat.ts',
    );
    expect(hasBadFormat).toBe(true);

    const badFormatEntry = filesFailedToFormat.find(
      (entry) =>
        entry.filePath.includes('badFormat.ts') ||
        entry.filePath === 'badFormat.ts',
    );
    expect(badFormatEntry).toBeDefined();
    expect(badFormatEntry?.errorMessage).toBeDefined();
    expect(typeof badFormatEntry?.errorMessage).toBe('string');
  });

  it('should still include failed files in the structure with unformatted content', async () => {
    const formData = createFormData();
    const userFiles = createMockUserFiles();

    const buildResult = await buildProjectFiles(
      '/Projects/BadFormatTest/structure.yaml',
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const badFormatFile = findFileInStructure(
      buildResult.structure,
      'badFormat.ts',
    );

    expect(badFormatFile).toBeDefined();
    expect(badFormatFile).not.toBeNull();

    if (badFormatFile) {
      expect(badFormatFile.content).toContain('const arrayOfNumbersVariable');
      expect(badFormatFile.content).toContain('[1, 2, 3, 4;');
      expect(badFormatFile.content).not.toContain('[1, 2, 3, 4];');
    }
  });

  it('should return empty filesFailedToFormat array when all files format successfully', async () => {
    const formData = createFormData();
    const userFiles = createMockUserFiles();

    const buildResult = await buildProjectFiles(
      '/Projects/GoodFormatTest/structure.yaml',
      userFiles,
      masterSchema,
      formData,
      null,
    );

    expect(buildResult.filesFailedToFormat).toBeDefined();
    expect(Array.isArray(buildResult.filesFailedToFormat)).toBe(true);
    expect(buildResult.filesFailedToFormat.length).toBe(0);
  });

  it('should format good files correctly', async () => {
    const formData = createFormData();
    const userFiles = createMockUserFiles();

    const buildResult = await buildProjectFiles(
      '/Projects/GoodFormatTest/structure.yaml',
      userFiles,
      masterSchema,
      formData,
      null,
    );

    const goodFormatFile = findFileInStructure(
      buildResult.structure,
      'goodFormat.ts',
    );

    expect(goodFormatFile).toBeDefined();
    expect(goodFormatFile).not.toBeNull();

    if (goodFormatFile) {
      expect(goodFormatFile.content).toContain('[1, 2, 3, 4]');
    }
  });
});
