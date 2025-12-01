import { describe, it, expect } from 'vitest';
import { processDynamicFolders } from '@/utils/project-builder/project-processors/processDynamicFolders.ts';
import type { IStructure, IFolder, IFile } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';

describe('processDynamicFolders with --data-source', () => {
  const createTestUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'DataSources',
      children: [
        {
          type: 'folder',
          name: 'People',
          children: [
            {
              type: 'folder',
              name: 'john-doe',
              children: [
                {
                  type: 'file',
                  name: 'info.yaml',
                  content: `basic-info:
  name: John Doe
  email: john.doe@example.com
  phone: 123-456-7890
languages:
  - English
  - Filipino`,
                },
              ],
            },
            {
              type: 'folder',
              name: 'jane-smith',
              children: [
                {
                  type: 'file',
                  name: 'info.yaml',
                  content: `basic-info:
  name: Jane Smith
  email: jane.smith@example.com
  phone: 555-987-6543
languages:
  - English
  - Spanish`,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'folder',
          name: 'Employee-Files',
          children: [
            {
              type: 'folder',
              name: 'templates',
              children: [
                {
                  type: 'file',
                  name: 'Resume.txt',
                  content: `NAME: [[USE_DATA(basic-info.name)]]
EMAIL: [[USE_DATA(basic-info.email)]]
PHONE: [[USE_DATA(basic-info.phone)]]
LANGUAGES: [[USE_DATA(languages)]]`,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  it('should create folders with names from data source', async () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processDynamicFolders({
      folderName: "{{basic-info.name}}'s Files",
      children: [],
      schemaInfo: [],
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/Employee-Files/structure.yaml',
      formData: undefined,
      userMetadata: null,
      options: {
        'data-source': '/DataSources/People/**/info.yaml',
      },
    });

    expect(result).toHaveLength(2);

    const johnFolder = result.find(
      (item) => item.type === 'folder' && item.name === "John Doe's Files",
    );
    expect(johnFolder).toBeDefined();

    const janeFolder = result.find(
      (item) => item.type === 'folder' && item.name === "Jane Smith's Files",
    );
    expect(janeFolder).toBeDefined();
  });

  it('should pass data context to children with --scoped CREATE_FILE', async () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processDynamicFolders({
      folderName: "{{basic-info.name}}'s Files",
      children: [
        "CREATE_FILE({{basic-info.name}}'s Resume.html --scoped --template ./templates/Resume.txt)",
      ],
      schemaInfo: [],
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/Employee-Files/structure.yaml',
      formData: undefined,
      userMetadata: null,
      options: {
        'data-source': '/DataSources/People/**/info.yaml',
      },
    });

    expect(result).toHaveLength(2);

    const johnFolder = result.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === "John Doe's Files",
    );
    expect(johnFolder).toBeDefined();
    if (!johnFolder) {
      throw new Error('John folder not found');
    }

    expect(johnFolder.children).toHaveLength(1);
    const johnFile = johnFolder.children.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === "John Doe's Resume.html",
    );
    if (!johnFile) {
      throw new Error('John file not found');
    }

    expect(johnFile.type).toBe('file');
    expect(johnFile.content).toContain('NAME: John Doe');
    expect(johnFile.content).toContain('EMAIL: john.doe@example.com');
    expect(johnFile.content).toContain('PHONE: 123-456-7890');
    expect(johnFile.content).toContain('LANGUAGES:');
    expect(johnFile.content).toContain('English, Filipino');

    const janeFolder = result.find(
      (item): item is IFolder =>
        item.type === 'folder' && item.name === "Jane Smith's Files",
    );
    expect(janeFolder).toBeDefined();
    if (!janeFolder) {
      throw new Error('Jane folder not found');
    }

    expect(janeFolder.children).toHaveLength(1);
    const janeFile = janeFolder.children.find(
      (item): item is IFile =>
        item.type === 'file' && item.name === "Jane Smith's Resume.html",
    );
    if (!janeFile) {
      throw new Error('Jane file not found');
    }

    expect(janeFile.type).toBe('file');
    expect(janeFile.content).toContain('NAME: Jane Smith');
    expect(janeFile.content).toContain('EMAIL: jane.smith@example.com');
    expect(janeFile.content).toContain('PHONE: 555-987-6543');
    expect(janeFile.content).toContain('LANGUAGES:');
    expect(janeFile.content).toContain('English, Spanish');
  });

  it('should handle nested data properties in folder names', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'DataSources',
        children: [
          {
            type: 'folder',
            name: 'People',
            children: [
              {
                type: 'folder',
                name: 'alice',
                children: [
                  {
                    type: 'file',
                    name: 'info.yaml',
                    content: `user:
  profile:
    firstName: Alice
    lastName: Wonderland`,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processDynamicFolders({
      folderName: '{{user.profile.firstName}} {{user.profile.lastName}}',
      children: [],
      schemaInfo: [],
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/Test/structure.yaml',
      formData: undefined,
      userMetadata: null,
      options: {
        'data-source': '/DataSources/People/**/info.yaml',
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Alice Wonderland');
  });

  it('should return empty array when no files match the data source pattern', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'DataSources',
        children: [],
      },
    ];
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processDynamicFolders({
      folderName: "{{basic-info.name}}'s Files",
      children: [],
      schemaInfo: [],
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/Test/structure.yaml',
      formData: undefined,
      userMetadata: null,
      options: {
        'data-source': '/DataSources/People/**/info.yaml',
      },
    });

    expect(result).toHaveLength(0);
  });

  it('should provide folderName and folderPath in data context', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'DataSources',
        children: [
          {
            type: 'folder',
            name: 'People',
            children: [
              {
                type: 'folder',
                name: 'john-doe',
                children: [
                  {
                    type: 'file',
                    name: 'info.yaml',
                    content: `basic-info:
  name: John Doe`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'Test',
            children: [
              {
                type: 'folder',
                name: 'templates',
                children: [
                  {
                    type: 'file',
                    name: 'test.txt',
                    content: 'FOLDER: [[USE_DATA(folderName)]]',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processDynamicFolders({
      folderName: '{{folderName}}',
      children: [
        'CREATE_FILE(test.html --scoped --template ./templates/test.txt)',
      ],
      schemaInfo: [],
      schemaInfoParsed,
      userFiles,
      projectYamlPath: '/Projects/Test/structure.yaml',
      formData: undefined,
      userMetadata: null,
      options: {
        'data-source': '/DataSources/People/**/info.yaml',
      },
    });

    expect(result).toHaveLength(1);
    const firstFolder = result.find(
      (item): item is IFolder => item.type === 'folder',
    );
    expect(firstFolder).toBeDefined();
    if (!firstFolder) {
      throw new Error('First folder not found');
    }

    expect(firstFolder.name).toBe('john-doe');
    const file = firstFolder.children.find(
      (item): item is IFile => item.type === 'file',
    );
    if (!file) {
      throw new Error('File not found');
    }

    expect(file.content).toContain('FOLDER: john-doe');
  });
});
