import { describe, it, expect } from 'vitest';
import { importProject } from '@/utils/project-builder/project-processors/importProject.ts';
import { processYamlStructure } from '@/utils/project-builder/project-processors/processYamlStructure.ts';
import type { IStructure, IFile, IFolder } from '@/components/FileViewer.tsx';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import { findFileInStructure } from '@/utils/project-builder/utils/findFileInStructure.ts';
import { loadTemplateContent } from '@/utils/project-builder/utils/loadTemplateContent.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { CREATION_MODES } from '@/constants.ts';

const createMockFormData = (): IFormStore => ({
  schemaInput: {},
  backendUrl: 'http://localhost:5000',
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  framework: frameworks.LARAVEL,
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
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: '',
  setCreationMode: (): void => {
    /* stub */
  },
  setMasterSchema: (): void => {
    /* stub */
  },
  setOneToOne: (): void => {
    /* stub */
  },
  setOneToMany: (): void => {
    /* stub */
  },
  setManyToMany: (): void => {
    /* stub */
  },
  setDBType: (): void => {
    /* stub */
  },
  setPublicRepoURL: (): void => {
    /* stub */
  },
  setDbConnection: (): void => {
    /* stub */
  },
});

const findFolder = (
  structure: IStructure,
  name: string,
): IFolder | undefined => {
  return structure.find(
    (item): item is IFolder => item.type === 'folder' && item.name === name,
  );
};

const findFile = (structure: IStructure, name: string): IFile | undefined => {
  return structure.find(
    (item): item is IFile => item.type === 'file' && item.name === name,
  );
};

describe('importProject', () => {
  describe('loadTemplateContent utility', () => {
    it('should load template content from resolved path', () => {
      const templateContent = 'export const handleError = () => {};';

      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'Child',
              children: [
                {
                  type: 'folder',
                  name: 'templates',
                  children: [
                    {
                      type: 'file',
                      name: 'handleError.txt',
                      content: templateContent,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const result = loadTemplateContent(
        mockUserFiles,
        'Projects/Child/templates/handleError.txt',
        'Projects/Child/structure.yaml',
      );

      expect(result).toBe(templateContent);
    });
  });

  describe('processYamlStructure direct test', () => {
    it('should process CREATE_FILE command directly', async () => {
      const templateContent = 'export const handleError = () => {};';

      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'Child',
              children: [
                {
                  type: 'folder',
                  name: 'templates',
                  children: [
                    {
                      type: 'file',
                      name: 'handleError.txt',
                      content: templateContent,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const parsedYaml = {
        utils: [
          'CREATE_FILE(handleError.ts --template ./templates/handleError.txt)',
        ],
      };

      const result = await processYamlStructure({
        node: parsedYaml,
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Child/structure.yaml',
        formData,
      });

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('relative template paths', () => {
    it('should find project file in structure', () => {
      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'Child',
              children: [
                {
                  type: 'file',
                  name: 'structure.yaml',
                  content: 'test: value',
                },
              ],
            },
          ],
        },
      ];

      const file = findFileInStructure(
        'Projects/Child/structure.yaml',
        mockUserFiles,
      );
      expect(file).toBeDefined();
      expect(file?.content).toBe('test: value');
    });

    it('should resolve relative template paths correctly when importing a project', async () => {
      const templateContent = 'export const handleError = () => {};';

      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'Child',
              children: [
                {
                  type: 'file',
                  name: 'structure.yaml',
                  content: `utils:
  - CREATE_FILE(handleError.ts --template ./templates/handleError.txt)`,
                },
                {
                  type: 'folder',
                  name: 'templates',
                  children: [
                    {
                      type: 'file',
                      name: 'handleError.txt',
                      content: templateContent,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const result = await importProject({
        command: 'Projects/Child/structure.yaml',
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Parent/structure.yaml',
        formData,
      });

      expect(result.length).toBeGreaterThan(0);

      const utilsFolder = findFolder(result, 'utils');
      expect(utilsFolder).toBeDefined();

      if (utilsFolder) {
        const handleErrorFile = findFile(
          utilsFolder.children,
          'handleError.ts',
        );
        expect(handleErrorFile).toBeDefined();
        expect(handleErrorFile?.content).toBe(templateContent);
      }
    });

    it('should handle absolute template paths correctly', async () => {
      const templateContent = 'export const globalUtil = {};';

      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Templates',
          children: [
            {
              type: 'file',
              name: 'globalUtil.txt',
              content: templateContent,
            },
          ],
        },
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'TestProject',
              children: [
                {
                  type: 'file',
                  name: 'structure.yaml',
                  content: `utils:
  - CREATE_FILE(globalUtil.ts --template /Templates/globalUtil.txt)`,
                },
              ],
            },
          ],
        },
      ];

      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const result = await importProject({
        command: 'Projects/TestProject/structure.yaml',
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Parent/structure.yaml',
        formData,
      });

      expect(result.length).toBeGreaterThan(0);

      const utilsFolder = findFolder(result, 'utils');
      expect(utilsFolder).toBeDefined();

      if (utilsFolder) {
        const globalUtilFile = findFile(utilsFolder.children, 'globalUtil.ts');
        expect(globalUtilFile).toBeDefined();
        expect(globalUtilFile?.content).toBe(templateContent);
      }
    });

    it('should handle folder names with spaces and special characters', async () => {
      const templateContent = 'export const special = "works";';

      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'Template - Frontend',
              children: [
                {
                  type: 'file',
                  name: 'structure.yaml',
                  content: `hooks:
  - CREATE_FILE(handleError.ts --template ./templates/handleError.txt)`,
                },
                {
                  type: 'folder',
                  name: 'templates',
                  children: [
                    {
                      type: 'file',
                      name: 'handleError.txt',
                      content: templateContent,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const result = await importProject({
        command: 'Projects/Template - Frontend/structure.yaml',
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Express React/structure.yaml',
        formData,
      });

      expect(result.length).toBeGreaterThan(0);

      const hooksFolder = findFolder(result, 'hooks');
      expect(hooksFolder).toBeDefined();

      if (hooksFolder) {
        const handleErrorFile = findFile(
          hooksFolder.children,
          'handleError.ts',
        );
        expect(handleErrorFile).toBeDefined();
        expect(handleErrorFile?.content).toContain('export const special');
        expect(handleErrorFile?.content).toContain('works');
      }
    });

    it('should return empty content when relative template is not found', async () => {
      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [
            {
              type: 'folder',
              name: 'MissingTemplate',
              children: [
                {
                  type: 'file',
                  name: 'structure.yaml',
                  content: `utils:
  - CREATE_FILE(missing.ts --template ./templates/nonexistent.txt)`,
                },
              ],
            },
          ],
        },
      ];

      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const result = await importProject({
        command: 'Projects/MissingTemplate/structure.yaml',
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Parent/structure.yaml',
        formData,
      });

      expect(result.length).toBeGreaterThan(0);

      const utilsFolder = findFolder(result, 'utils');
      expect(utilsFolder).toBeDefined();

      if (utilsFolder) {
        const missingFile = findFile(utilsFolder.children, 'missing.ts');
        expect(missingFile).toBeDefined();
        expect(missingFile?.content).toBe('');
      }
    });
  });

  describe('edge cases', () => {
    it('should return empty array for non-existent project file', async () => {
      const mockUserFiles: IStructure = [
        {
          type: 'folder',
          name: 'Projects',
          children: [],
        },
      ];

      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const result = await importProject({
        command: 'Projects/NonExistent/structure.yaml',
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Parent/structure.yaml',
        formData,
      });

      expect(result).toEqual([]);
    });

    it('should handle null or undefined command gracefully', async () => {
      const mockUserFiles: IStructure = [];
      const schemaInfo = masterSchema;
      const schemaInfoParsed = getSchemaInfo(schemaInfo);
      const formData = createMockFormData();

      const result = await importProject({
        command: undefined,
        schemaInfo,
        schemaInfoParsed,
        userFiles: mockUserFiles,
        projectYamlPath: 'Projects/Parent/structure.yaml',
        formData,
      });

      expect(result).toEqual([]);
    });
  });
});
