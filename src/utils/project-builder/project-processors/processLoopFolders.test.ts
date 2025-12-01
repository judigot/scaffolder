import { describe, it, expect } from 'vitest';
import { processLoopFolders } from './processLoopFolders.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';

describe('processLoopFolders', () => {
  it('should generate files with dynamic names from data source', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Employees',
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

    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processLoopFolders({
      command: "{{basic-info.name}}'s-Resume.html",
      options: {
        'data-source': '/Employees/**/info.yaml',
        template: './templates/Resume.txt',
        isRelativePath: true,
      },
      userFiles,
      projectYamlPath: '/Projects/Employee-Files/structure.yaml',
      schemaInfoParsed,
      schemaInfo: [],
      formData: undefined,
      userMetadata: null,
    });

    expect(result).toHaveLength(2);

    const johnDoeFile = result.find(
      (file) => file.name === "John Doe's-Resume.html",
    );
    expect(johnDoeFile).toBeDefined();
    expect(johnDoeFile?.content).toContain('NAME: John Doe');
    expect(johnDoeFile?.content).toContain('EMAIL: john.doe@example.com');
    expect(johnDoeFile?.content).toContain('PHONE: 123-456-7890');
    expect(johnDoeFile?.content).toContain('LANGUAGES:');
    expect(johnDoeFile?.content).toContain('English, Filipino');

    const janeSmithFile = result.find(
      (file) => file.name === "Jane Smith's-Resume.html",
    );
    expect(janeSmithFile).toBeDefined();
    expect(janeSmithFile?.content).toContain('NAME: Jane Smith');
    expect(janeSmithFile?.content).toContain('EMAIL: jane.smith@example.com');
    expect(janeSmithFile?.content).toContain('PHONE: 555-987-6543');
    expect(janeSmithFile?.content).toContain('LANGUAGES:');
    expect(janeSmithFile?.content).toContain('English, Spanish');
  });

  it('should handle nested data properties in filename', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Employees',
        children: [
          {
            type: 'folder',
            name: 'alice',
            children: [
              {
                type: 'file',
                name: 'info.yaml',
                content: `basic-info:
  name: Alice Wonderland
  email: alice@example.com`,
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
                    content: 'NAME: [[USE_DATA(basic-info.name)]]',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processLoopFolders({
      command: '{{basic-info.name}}-Resume.html',
      options: {
        'data-source': '/Employees/**/info.yaml',
        template: './templates/Resume.txt',
        isRelativePath: true,
      },
      userFiles,
      projectYamlPath: '/Projects/Employee-Files/structure.yaml',
      schemaInfoParsed,
      schemaInfo: [],
      formData: undefined,
      userMetadata: null,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Alice Wonderland-Resume.html');
  });

  it('should return empty array when data source pattern is missing', async () => {
    const userFiles: IStructure = [];
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processLoopFolders({
      command: 'test.html',
      options: {},
      userFiles,
      projectYamlPath: '/Projects/Test/structure.yaml',
      schemaInfoParsed,
      schemaInfo: [],
      formData: undefined,
      userMetadata: null,
    });

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no files match the pattern', async () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Employees',
        children: [],
      },
    ];
    const schemaInfoParsed = getSchemaInfo([]);

    const result = await processLoopFolders({
      command: 'test.html',
      options: {
        'data-source': '/Employees/**/info.yaml',
      },
      userFiles,
      projectYamlPath: '/Projects/Test/structure.yaml',
      schemaInfoParsed,
      schemaInfo: [],
      formData: undefined,
      userMetadata: null,
    });

    expect(result).toHaveLength(0);
  });
});
