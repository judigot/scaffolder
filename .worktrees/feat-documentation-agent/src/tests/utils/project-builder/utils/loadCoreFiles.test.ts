import { describe, it, expect } from 'vitest';
import { loadCoreFiles } from '@/utils/project-builder/utils/loadCoreFiles.ts';
import type { IStructure } from '@/components/FileViewer.tsx';

describe('loadCoreFiles', () => {
  const createMockStructure = (): IStructure => [
    {
      type: 'folder',
      name: 'Core',
      children: [
        {
          type: 'folder',
          name: 'vite',
          children: [
            {
              type: 'file',
              name: '.gitignore',
              content: 'node_modules/',
            },
            {
              type: 'file',
              name: 'package.json',
              content: '{"name": "vite"}',
            },
          ],
        },
        {
          type: 'folder',
          name: 'react',
          children: [
            {
              type: 'file',
              name: '.prettierrc',
              content: '{"semi": true}',
            },
          ],
        },
        {
          type: 'folder',
          name: 'extra',
          children: [
            {
              type: 'file',
              name: 'README.md',
              content: '# README',
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
          name: 'Test Project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: '$USE_CORE: /Core/vite\nsrc:\n  - index.ts',
            },
            {
              type: 'folder',
              name: 'core',
              children: [
                {
                  type: 'file',
                  name: 'local.txt',
                  content: 'local file',
                },
              ],
            },
          ],
        },
        {
          type: 'folder',
          name: 'Multi Import Project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content:
                '$USE_CORE:\n  - /Core/vite\n  - /Core/react\nsrc:\n  - index.ts',
            },
          ],
        },
        {
          type: 'folder',
          name: 'No Core Project',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: 'src:\n  - index.ts',
            },
          ],
        },
        {
          type: 'folder',
          name: 'Local Core Only',
          children: [
            {
              type: 'file',
              name: 'structure.yaml',
              content: 'src:\n  - index.ts',
            },
            {
              type: 'folder',
              name: 'core',
              children: [
                {
                  type: 'file',
                  name: 'config.js',
                  content: 'module.exports = {}',
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  it('should load single core import', () => {
    const userFiles = createMockStructure();
    const result = loadCoreFiles(
      '/Projects/Test Project/structure.yaml',
      userFiles,
    );

    expect(result.find((f) => f.name === '.gitignore')).toBeDefined();
    expect(result.find((f) => f.name === 'package.json')).toBeDefined();
    expect(result.find((f) => f.name === 'local.txt')).toBeDefined();
  });

  it('should merge multiple core imports in order', () => {
    const userFiles = createMockStructure();
    const result = loadCoreFiles(
      '/Projects/Multi Import Project/structure.yaml',
      userFiles,
    );

    expect(result.find((f) => f.name === '.gitignore')).toBeDefined();
    expect(result.find((f) => f.name === 'package.json')).toBeDefined();
    expect(result.find((f) => f.name === '.prettierrc')).toBeDefined();
  });

  it('should handle project with no core imports', () => {
    const userFiles = createMockStructure();
    const result = loadCoreFiles(
      '/Projects/No Core Project/structure.yaml',
      userFiles,
    );

    expect(result).toEqual([]);
  });

  it('should load local core folder when no imports specified', () => {
    const userFiles = createMockStructure();
    const result = loadCoreFiles(
      '/Projects/Local Core Only/structure.yaml',
      userFiles,
    );

    expect(result).toHaveLength(1);
    expect(result.find((f) => f.name === 'config.js')).toBeDefined();
  });

  it('should prioritize local core over imports', () => {
    const userFilesWithConflict: IStructure = [
      {
        type: 'folder',
        name: 'Core',
        children: [
          {
            type: 'folder',
            name: 'base',
            children: [
              {
                type: 'file',
                name: 'config.js',
                content: 'base config',
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
            name: 'Override Project',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: '$USE_CORE: /Core/base\nsrc:\n  - index.ts',
              },
              {
                type: 'folder',
                name: 'core',
                children: [
                  {
                    type: 'file',
                    name: 'config.js',
                    content: 'local override',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = loadCoreFiles(
      '/Projects/Override Project/structure.yaml',
      userFilesWithConflict,
    );

    const configFile = result.find((f) => f.name === 'config.js');
    expect(configFile).toBeDefined();
    if (configFile?.type === 'file') {
      expect(configFile.content).toBe('local override');
    }
  });

  it('should return empty array for non-existent project', () => {
    const userFiles = createMockStructure();
    const result = loadCoreFiles(
      '/Projects/Non Existent/structure.yaml',
      userFiles,
    );

    expect(result).toEqual([]);
  });

  it('should handle invalid core import paths gracefully', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'Bad Import',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: '$USE_CORE: /Core/nonexistent\nsrc:\n  - index.ts',
              },
            ],
          },
        ],
      },
    ];

    const result = loadCoreFiles(
      '/Projects/Bad Import/structure.yaml',
      userFiles,
    );

    expect(result).toEqual([]);
  });
});
