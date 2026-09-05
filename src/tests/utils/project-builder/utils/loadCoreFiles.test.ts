import { describe, it, expect } from 'vitest';
import {
  CoreMergeError,
  loadCoreFiles,
} from '@/utils/project-builder/utils/loadCoreFiles.ts';
import { TemplateBaseError } from '@/utils/project-builder/utils/resolveTemplateBase.ts';
import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';

const PINNED_SHA = '0123456789abcdef0123456789abcdef01234567';
const PINNED_URL = `https://github.com/judigot/template-monorepo/tree/${PINNED_SHA}`;

function findFolder(structure: IStructure, name: string): IFolder | undefined {
  const found = structure.find((item) => item.name === name);
  return found?.type === 'folder' ? found : undefined;
}

function findFile(structure: IStructure, name: string): IFile | undefined {
  const found = structure.find((item) => item.name === name);
  return found?.type === 'file' ? found : undefined;
}

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

  it('applies replace globs before Nest and strips leftover hono deps', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Core',
        children: [
          {
            type: 'folder',
            name: 'template-monorepo',
            children: [
              {
                type: 'folder',
                name: 'apps',
                children: [
                  {
                    type: 'folder',
                    name: 'api',
                    children: [
                      {
                        type: 'file',
                        name: 'package.json',
                        content:
                          '{"name":"hono-api","dependencies":{"hono":"^4.0.0"}}',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'file',
                name: 'package.json',
                content:
                  '{"name":"root","dependencies":{"hono":"^4.0.0","turbo":"^2.0.0"}}',
              },
            ],
          },
          {
            type: 'folder',
            name: 'nestjs-api',
            children: [
              {
                type: 'folder',
                name: 'apps',
                children: [
                  {
                    type: 'folder',
                    name: 'api',
                    children: [
                      {
                        type: 'file',
                        name: 'package.json',
                        content:
                          '{"name":"@bigbang/api","dependencies":{"@nestjs/core":"^11.0.0"}}',
                      },
                    ],
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
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content:
                  '$BASE: /Core/template-monorepo\nreplace:\n  - apps/api/**\n$USE_CORE:\n  - /Core/template-monorepo\n  - /Core/nestjs-api\n',
              },
            ],
          },
        ],
      },
    ];

    const result = loadCoreFiles(
      '/Projects/template-monorepo/structure.yaml',
      userFiles,
    );

    const rootPackage = result.find((item) => item.name === 'package.json');
    expect(rootPackage?.type).toBe('file');
    if (rootPackage?.type === 'file') {
      const parsed: unknown = JSON.parse(rootPackage.content);
      expect(parsed).toEqual({
        name: 'root',
        dependencies: { turbo: '^2.0.0' },
      });
    }

    const apps = result.find((item) => item.name === 'apps');
    expect(apps?.type).toBe('folder');
    if (apps?.type === 'folder') {
      const api = apps.children.find((item) => item.name === 'api');
      expect(api?.type).toBe('folder');
      if (api?.type === 'folder') {
        const apiPackage = api.children.find(
          (item) => item.name === 'package.json',
        );
        expect(apiPackage?.type).toBe('file');
        if (apiPackage?.type === 'file') {
          expect(apiPackage.content).toContain('@nestjs/core');
          expect(apiPackage.content).not.toContain('hono');
        }
      }
    }
  });

  it('refuses a live Hono template plus Nest recipe without replace', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Core',
        children: [
          {
            type: 'folder',
            name: 'nestjs-api',
            children: [
              {
                type: 'file',
                name: 'main.ts',
                content: 'nest',
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
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: '$USE_CORE:\n  - /Core/nestjs-api\n',
              },
            ],
          },
        ],
      },
    ];

    const remoteHono: IStructure = [
      {
        type: 'folder',
        name: 'apps',
        children: [
          {
            type: 'folder',
            name: 'api',
            children: [
              {
                type: 'file',
                name: 'package.json',
                content: '{"dependencies":{"hono":"^4.0.0"}}',
              },
            ],
          },
        ],
      },
    ];

    expect(() =>
      loadCoreFiles('/Projects/template-monorepo/structure.yaml', userFiles, {
        remoteBaseLayer: remoteHono,
      }),
    ).toThrow(/replace: \[apps\/api\/\*\*\]/);
  });

  it('loads a remote recipe $BASE when the layer was fetched', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: `$BASE: ${PINNED_URL}\nreadme:\n  CREATE_FILE(README.md):\n`,
              },
            ],
          },
        ],
      },
    ];
    const remoteStarter: IStructure = [
      { type: 'file', name: 'starter.txt', content: 'from-recipe-base' },
    ];

    const result = loadCoreFiles(
      '/Projects/template-monorepo/structure.yaml',
      userFiles,
      { remoteBaseLayer: remoteStarter },
    );

    const starter = findFile(result, 'starter.txt');
    expect(starter?.content).toBe('from-recipe-base');
  });

  it('uses a request override layer instead of the recipe remote $BASE', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: `$BASE: ${PINNED_URL}\nreadme:\n  CREATE_FILE(README.md):\n`,
              },
            ],
          },
        ],
      },
    ];

    const result = loadCoreFiles(
      '/Projects/template-monorepo/structure.yaml',
      userFiles,
      {
        templateRepoOverride: `https://github.com/judigot/template-monorepo/commit/${PINNED_SHA}`,
        remoteBaseLayer: [
          { type: 'file', name: 'override.txt', content: 'from-override' },
        ],
      },
    );

    expect(findFile(result, 'override.txt')?.content).toBe('from-override');
  });

  it('fails explicitly when a remote recipe $BASE was not fetched', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Projects',
        children: [
          {
            type: 'folder',
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content: `$BASE: ${PINNED_URL}\n`,
              },
            ],
          },
        ],
      },
    ];

    expect(() =>
      loadCoreFiles('/Projects/template-monorepo/structure.yaml', userFiles),
    ).toThrow(TemplateBaseError);
  });

  it('keeps an unrelated Hono app when replacing the primary API', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Core',
        children: [
          {
            type: 'folder',
            name: 'template-monorepo',
            children: [
              {
                type: 'folder',
                name: 'apps',
                children: [
                  {
                    type: 'folder',
                    name: 'api',
                    children: [
                      {
                        type: 'file',
                        name: 'package.json',
                        content:
                          '{"name":"hono-api","dependencies":{"hono":"^4.0.0"}}',
                      },
                    ],
                  },
                  {
                    type: 'folder',
                    name: 'worker',
                    children: [
                      {
                        type: 'file',
                        name: 'package.json',
                        content:
                          '{"name":"hono-worker","dependencies":{"hono":"^4.0.0"}}',
                      },
                      {
                        type: 'file',
                        name: 'index.ts',
                        content: 'import { Hono } from "hono";\n',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'folder',
            name: 'hono-api',
            children: [
              {
                type: 'folder',
                name: 'apps',
                children: [
                  {
                    type: 'folder',
                    name: 'api',
                    children: [
                      {
                        type: 'file',
                        name: 'package.json',
                        content:
                          '{"name":"replacement-api","dependencies":{"hono":"^4.9.0"}}',
                      },
                    ],
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
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content:
                  '$BASE: /Core/template-monorepo\nreplace:\n  - apps/api/**\n$USE_CORE:\n  - /Core/hono-api\n',
              },
            ],
          },
        ],
      },
    ];

    const result = loadCoreFiles(
      '/Projects/template-monorepo/structure.yaml',
      userFiles,
    );

    const apps = findFolder(result, 'apps');
    expect(apps).toBeDefined();
    if (apps === undefined) {
      return;
    }
    const worker = findFolder(apps.children, 'worker');
    expect(worker).toBeDefined();
    if (worker === undefined) {
      return;
    }
    const workerPackage = findFile(worker.children, 'package.json');
    expect(workerPackage?.content).toContain('"hono"');
    const workerSource = findFile(worker.children, 'index.ts');
    expect(workerSource?.content).toContain('from "hono"');
  });

  it('refuses Nest when only the API manifest is replaced', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'Core',
        children: [
          {
            type: 'folder',
            name: 'template-monorepo',
            children: [
              {
                type: 'folder',
                name: 'apps',
                children: [
                  {
                    type: 'folder',
                    name: 'api',
                    children: [
                      {
                        type: 'file',
                        name: 'package.json',
                        content: '{"dependencies":{"hono":"^4.0.0"}}',
                      },
                      {
                        type: 'file',
                        name: 'index.ts',
                        content: 'import { Hono } from "hono";\n',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'folder',
            name: 'nestjs-api',
            children: [
              {
                type: 'file',
                name: 'main.ts',
                content: 'nest',
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
            name: 'template-monorepo',
            children: [
              {
                type: 'file',
                name: 'structure.yaml',
                content:
                  '$BASE: /Core/template-monorepo\nreplace:\n  - apps/api/package.json\n$USE_CORE:\n  - /Core/nestjs-api\n',
              },
            ],
          },
        ],
      },
    ];

    expect(() =>
      loadCoreFiles('/Projects/template-monorepo/structure.yaml', userFiles),
    ).toThrow(CoreMergeError);
  });
});
