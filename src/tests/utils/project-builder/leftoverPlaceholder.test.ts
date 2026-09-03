import { describe, expect, it } from 'vitest';
import { CREATION_MODES } from '@/constants.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { SCAFFOLDER_MESSAGE_CODES } from '@/interfaces/scaffolderMessages.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';

const createFormData = (): IFormStore => ({
  schemaInput: {},
  backendUrl: 'http://localhost:5000',
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  framework: frameworks.HONO,
  includeInsertData: false,
  insertOption: 'SQLInsertQueriesFromMockData',
  includeTypeGuards: false,
  outputOnSingleFile: false,
  dbType: 'postgresql',
  quote: '"',
  publicRepoURL: '',
  clientID: '',
  clientSecret: '',
  creationMode: CREATION_MODES.SCHEMA_BUILDER,
  dbUsername: '',
  dbPassword: '',
  dbHost: '',
  dbPort: 0,
  dbName: '',
  setCreationMode: (): void => {
    return;
  },
  setMasterSchema: (): void => {
    return;
  },
  setOneToOne: (): void => {
    return;
  },
  setOneToMany: (): void => {
    return;
  },
  setManyToMany: (): void => {
    return;
  },
  setDBType: (): void => {
    return;
  },
  setPublicRepoURL: (): void => {
    return;
  },
  setDbConnection: (): void => {
    return;
  },
});

const leftoverUserFiles: IStructure = [
  {
    type: 'folder',
    name: 'Projects',
    children: [
      {
        type: 'folder',
        name: 'LeftoverMarkerTest',
        children: [
          {
            type: 'file',
            name: 'structure.yaml',
            content:
              'CREATE_FILE(auth.ts --template ./templates/auth.txt):',
          },
          {
            type: 'folder',
            name: 'templates',
            children: [
              {
                type: 'file',
                name: 'auth.txt',
                content:
                  'const column = <@@>definitelyMissingReplacementKey</@@>;\n',
              },
            ],
          },
        ],
      },
    ],
  },
];

describe('leftover template markers fail generate before prettier', () => {
  it('reports LEFTOVER_PLACEHOLDER instead of FORMAT_ERROR', async () => {
    const result = await buildProjectFiles(
      '/Projects/LeftoverMarkerTest/structure.yaml',
      leftoverUserFiles,
      masterSchema,
      createFormData(),
      null,
    );

    expect(result.hasErrors).toBe(true);
    expect(result.filesFailedToFormat).toEqual([]);
    expect(result.messages?.some((message) => message.code === SCAFFOLDER_MESSAGE_CODES.LeftoverPlaceholder)).toBe(
      true,
    );
    expect(result.messages?.some((message) => message.code === SCAFFOLDER_MESSAGE_CODES.FormatError)).toBe(
      false,
    );
    const leftover = result.messages?.find(
      (message) => message.code === SCAFFOLDER_MESSAGE_CODES.LeftoverPlaceholder,
    );
    expect(leftover?.details?.join(' ')).toContain(
      'definitelyMissingReplacementKey',
    );
  });
});
