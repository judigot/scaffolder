import { describe, it, expect } from 'vitest';
import { buildProjectFiles } from '@/utils/project-builder/buildProjectFiles.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { CREATION_MODES } from '@/constants.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import masterJSONSchema from '@/json-schemas/masterJSONSchema.ts';

describe('Preview vs Export Structure Consistency', () => {
  const createSchema = (): ISchemaInfo[] => masterSchema;

  // Hardcoded structure mimicking the App project
  // App project has: structure.yaml with CREATE_FILE commands and Templates/env.txt with USE_USER_ENV
  const createUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'App',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: [
                'CREATE_FILE(badFormat.ts --template ./templates/badFormat.txt):',
                'CREATE_FILE(.env --template /Templates/env.txt):',
              ].join('\n'),
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
      ],
    },
    {
      type: 'folder',
      name: 'Templates',
      children: [
        {
          type: 'file',
          name: 'env.txt',
          content: [
            '# Application Configuration',
            'APP_URL=[[USE_FORM_DATA(backendUrl)]]',
            'FRAMEWORK=[[USE_FORM_DATA(framework)]]',
            'NODE_ENV=development',
            'PORT=3000',
            '',
            '# Database Configuration',
            'DB_CONNECTION=[[USE_FORM_DATA(dbType)]]',
            'DB_HOST=[[USE_FORM_DATA(dbHost)]]',
            'DB_PORT=[[USE_FORM_DATA(dbPort)]]',
            'DB_DATABASE=[[USE_FORM_DATA(dbName)]]',
            'DB_USERNAME=[[USE_FORM_DATA(dbUsername)]]',
            'DB_PASSWORD=[[USE_FORM_DATA(dbPassword)]]',
            '',
            '# User Environment Variables',
            'TEST_ENV=[[USE_USER_ENV(Test)]]',
          ].join('\n'),
        },
      ],
    },
  ];

  const createFormData = (): IFormStore => ({
    schemaInput: masterJSONSchema,
    backendUrl: 'http://localhost:5000',
    backendDir: '',
    frontendDir: '',
    dbConnection: 'postgresql://localhost:5432/test',
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
    dbHost: '',
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
    setQuote: (): void => {
      /* stub */
    },
    setFramework: (): void => {
      /* stub */
    },
    setBackendUrl: (): void => {
      /* stub */
    },
    setBackendDir: (): void => {
      /* stub */
    },
    setFrontendDir: (): void => {
      /* stub */
    },
    setDBConnection: (): void => {
      /* stub */
    },
    setDBUsername: (): void => {
      /* stub */
    },
    setDBPassword: (): void => {
      /* stub */
    },
    setDBHost: (): void => {
      /* stub */
    },
    setDBPort: (): void => {
      /* stub */
    },
    setDBName: (): void => {
      /* stub */
    },
    setIncludeInsertData: (): void => {
      /* stub */
    },
    setInsertOption: (): void => {
      /* stub */
    },
    setIncludeTypeGuards: (): void => {
      /* stub */
    },
    setOutputOnSingleFile: (): void => {
      /* stub */
    },
    setPublicRepoURL: (): void => {
      /* stub */
    },
    setClientID: (): void => {
      /* stub */
    },
    setClientSecret: (): void => {
      /* stub */
    },
    setDbConnection: (): void => {
      /* stub */
    },
  });

  const createUserMetadata = () => ({
    env: {
      Test: 'test-value',
    },
  });

  /**
   * Recursively extracts all file paths and content from a structure
   */
  const extractFileStructure = (
    structure: IStructure,
    basePath = '',
  ): Map<string, string> => {
    const files = new Map<string, string>();

    for (const item of structure) {
      const currentPath =
        basePath === '' ? item.name : `${basePath}/${item.name}`;

      if (item.type === 'file') {
        files.set(currentPath, item.content);
      } else {
        const nestedFiles = extractFileStructure(item.children, currentPath);
        for (const [path, content] of nestedFiles) {
          files.set(path, content);
        }
      }
    }

    return files;
  };

  /**
   * Compares two structures and returns differences
   */
  const compareStructures = (
    preview: IStructure,
    exportStructure: IStructure,
  ): {
    match: boolean;
    differences: {
      filePath: string;
      previewContent: string;
      exportContent: string;
    }[];
    missingInExport: string[];
    missingInPreview: string[];
  } => {
    const previewFiles = extractFileStructure(preview);
    const exportFiles = extractFileStructure(exportStructure);

    const differences: {
      filePath: string;
      previewContent: string;
      exportContent: string;
    }[] = [];
    const missingInExport: string[] = [];
    const missingInPreview: string[] = [];

    // Check files in preview
    for (const [filePath, previewContent] of previewFiles) {
      const exportContent = exportFiles.get(filePath);
      if (exportContent === undefined) {
        missingInExport.push(filePath);
      } else if (previewContent !== exportContent) {
        differences.push({
          filePath,
          previewContent,
          exportContent,
        });
      }
    }

    // Check files in export that are missing in preview
    for (const [filePath] of exportFiles) {
      if (!previewFiles.has(filePath)) {
        missingInPreview.push(filePath);
      }
    }

    const match =
      differences.length === 0 &&
      missingInExport.length === 0 &&
      missingInPreview.length === 0;

    return {
      match,
      differences,
      missingInExport,
      missingInPreview,
    };
  };

  it('should produce identical structures when preview and export both use userMetadata', async () => {
    const schemaInfo = createSchema();
    const userFiles = createUserFiles();
    const formData = createFormData();
    const userMetadata = createUserMetadata();

    // Use the actual App project which uses USE_USER_ENV
    // Simulate preview build (with userMetadata)
    const previewResult = await buildProjectFiles(
      '/Projects/App/structure.yaml',
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
    );

    // Simulate export build (with userMetadata - this is what should happen)
    const exportResult = await buildProjectFiles(
      '/Projects/App/structure.yaml',
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
    );

    const comparison = compareStructures(
      previewResult.structure,
      exportResult.structure,
    );

    expect(comparison.match).toBe(true);
    expect(comparison.differences).toHaveLength(0);
    expect(comparison.missingInExport).toHaveLength(0);
    expect(comparison.missingInPreview).toHaveLength(0);
  });

  it('should detect differences when preview uses userMetadata but export does not', async () => {
    const schemaInfo = createSchema();
    const userFiles = createUserFiles();
    const formData = createFormData();
    const userMetadata = createUserMetadata();

    // Use the actual App project which uses USE_USER_ENV
    // Simulate preview build (with userMetadata)
    const previewResult = await buildProjectFiles(
      '/Projects/App/structure.yaml',
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
    );

    // Simulate export build (without userMetadata - regression test)
    const exportResult = await buildProjectFiles(
      '/Projects/App/structure.yaml',
      userFiles,
      schemaInfo,
      formData,
      undefined,
    );

    const comparison = compareStructures(
      previewResult.structure,
      exportResult.structure,
    );

    // They should NOT match when export doesn't use userMetadata
    expect(comparison.match).toBe(false);

    // The .env file using USE_USER_ENV should have different content
    const envFileDiff = comparison.differences.find((diff) =>
      diff.filePath.includes('.env'),
    );
    expect(envFileDiff).toBeDefined();
    if (envFileDiff !== undefined) {
      // Preview should have replaced USE_USER_ENV with actual values
      expect(envFileDiff.previewContent).toContain('TEST_ENV=test-value');

      // Export should have empty strings (USE_USER_ENV replaced with empty when no metadata)
      expect(envFileDiff.exportContent).not.toContain('TEST_ENV=test-value');
      expect(envFileDiff.exportContent).toContain('TEST_ENV=');
    }
  });

  it('should produce identical structures when no USE_USER_ENV is used', async () => {
    const schemaInfo = createSchema();
    const userFilesWithoutUserEnv: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'PlainProject',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: 'CREATE_FILE(.env --template /Templates/plain.txt):',
              },
            ],
          },
        ],
      },
      {
        type: 'folder',
        name: 'Templates',
        children: [
          {
            type: 'file',
            name: 'plain.txt',
            content: [
              'API_KEY=test-key',
              'DATABASE_URL=postgresql://localhost:5432/testdb',
              'PORT=3000',
            ].join('\n'),
          },
        ],
      },
    ];
    const formData = createFormData();
    const userMetadata = createUserMetadata();

    // Simulate preview build (with userMetadata, but not needed)
    const previewResult = await buildProjectFiles(
      '/Projects/PlainProject/structure.yaml',
      userFilesWithoutUserEnv,
      schemaInfo,
      formData,
      userMetadata,
    );

    // Simulate export build (without userMetadata)
    const exportResult = await buildProjectFiles(
      '/Projects/PlainProject/structure.yaml',
      userFilesWithoutUserEnv,
      schemaInfo,
      formData,
      undefined,
    );

    const comparison = compareStructures(
      previewResult.structure,
      exportResult.structure,
    );

    // They should match when no USE_USER_ENV is used
    expect(comparison.match).toBe(true);
    expect(comparison.differences).toHaveLength(0);
  });

  it('should track filesUsingUserEnv consistently in both preview and export', async () => {
    const schemaInfo = createSchema();
    const userFiles = createUserFiles();
    const formData = createFormData();
    const userMetadata = createUserMetadata();

    // Use the App project which uses USE_USER_ENV
    // Simulate preview build
    const previewResult = await buildProjectFiles(
      '/Projects/App/structure.yaml',
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
    );

    // Simulate export build
    const exportResult = await buildProjectFiles(
      '/Projects/App/structure.yaml',
      userFiles,
      schemaInfo,
      formData,
      userMetadata,
    );

    // Both should detect the same files using USE_USER_ENV
    expect(previewResult.filesUsingUserEnv).toEqual(
      exportResult.filesUsingUserEnv,
    );
    // The .env file should be tracked
    expect(previewResult.filesUsingUserEnv.length).toBeGreaterThan(0);
    expect(
      previewResult.filesUsingUserEnv.some((path) => path.includes('.env')),
    ).toBe(true);

    // Both should have the same filesFailedToFormat
    expect(previewResult.filesFailedToFormat).toEqual(
      exportResult.filesFailedToFormat,
    );
  });

  it.skip('should handle complex nested structures with USE_USER_ENV', async () => {
    const schemaInfo = createSchema();
    const complexUserFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'ComplexProject',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: [
                  'structure:',
                  '  - type: folder',
                  '    name: src',
                  '    children:',
                  '      - type: folder',
                  '        name: config',
                  '        children:',
                  '          - type: file',
                  '            name: database.php',
                  '            template: Templates/db-config.txt',
                  '          - type: file',
                  '            name: app.php',
                  '            template: Templates/app-config.txt',
                  '      - type: folder',
                  '        name: services',
                  '        children:',
                  '          - type: file',
                  '            name: api-service.ts',
                  '            template: Templates/api-service.txt',
                ].join('\n'),
              },
            ],
          },
          {
            type: 'folder',
            name: 'Templates',
            children: [
              {
                type: 'file',
                name: 'db-config.txt',
                content: [
                  'DB_HOST=[[USE_USER_ENV(DB_HOST)]]',
                  'DB_PORT=[[USE_USER_ENV(DB_PORT)]]',
                  'DB_NAME=[[USE_USER_ENV(DB_NAME)]]',
                ].join('\n'),
              },
              {
                type: 'file',
                name: 'app-config.txt',
                content: [
                  'APP_NAME=[[USE_USER_ENV(APP_NAME)]]',
                  'APP_ENV=[[USE_USER_ENV(APP_ENV)]]',
                ].join('\n'),
              },
              {
                type: 'file',
                name: 'api-service.txt',
                content: [
                  "const API_KEY = '[[USE_USER_ENV(API_KEY)]]';",
                  "const BASE_URL = '[[USE_USER_ENV(BASE_URL)]]';",
                ].join('\n'),
              },
            ],
          },
        ],
      },
    ];
    const formData = createFormData();
    const complexUserMetadata = {
      env: {
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'testdb',
        APP_NAME: 'MyApp',
        APP_ENV: 'production',
        API_KEY: 'sk-complex-key-123',
        BASE_URL: 'https://api.example.com',
      },
    };

    // Simulate preview build
    const previewResult = await buildProjectFiles(
      '/Projects/ComplexProject/structure.yaml',
      complexUserFiles,
      schemaInfo,
      formData,
      complexUserMetadata,
    );

    // Simulate export build
    const exportResult = await buildProjectFiles(
      '/Projects/ComplexProject/structure.yaml',
      complexUserFiles,
      schemaInfo,
      formData,
      complexUserMetadata,
    );

    const comparison = compareStructures(
      previewResult.structure,
      exportResult.structure,
    );

    expect(comparison.match).toBe(true);
    expect(comparison.differences).toHaveLength(0);

    // Verify all USE_USER_ENV files are tracked
    expect(previewResult.filesUsingUserEnv.length).toBe(3);
    expect(exportResult.filesUsingUserEnv.length).toBe(3);
    expect(previewResult.filesUsingUserEnv).toContain(
      'src/config/database.php',
    );
    expect(previewResult.filesUsingUserEnv).toContain('src/config/app.php');
    expect(previewResult.filesUsingUserEnv).toContain(
      'src/services/api-service.ts',
    );
  });
});
