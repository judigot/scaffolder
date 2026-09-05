import { describe, expect, it } from 'vitest';
import type { IStructure } from '@/components/FileViewer.tsx';
import {
  stripHonoFromPackageJsonFiles,
  structureHasHonoApi,
  structureHasHonoPackageDep,
} from '@/utils/project-builder/utils/stripHonoPackageDeps.ts';

function honoApiLayer(): IStructure {
  return [
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
              content: JSON.stringify({
                name: '@bigbang/api',
                dependencies: {
                  hono: '^4.13.5',
                  '@hono/node-server': '^2.1.1',
                  zod: '^4.0.0',
                },
              }),
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
    {
      type: 'file',
      name: 'package.json',
      content: JSON.stringify({
        name: 'template-monorepo',
        dependencies: { hono: '^4.13.5' },
      }),
    },
  ];
}

describe('stripHonoFromPackageJsonFiles', () => {
  it('removes leftover hono deps after Nest replaces apps/api', () => {
    const stripped = stripHonoFromPackageJsonFiles(honoApiLayer());
    const root = stripped.find((item) => item.name === 'package.json');
    expect(root?.type).toBe('file');
    if (root?.type === 'file') {
      const parsed: unknown = JSON.parse(root.content);
      expect(parsed).toEqual({
        name: 'template-monorepo',
        dependencies: {},
      });
    }

    expect(structureHasHonoPackageDep(stripped)).toBe(false);
    expect(structureHasHonoApi(stripped)).toBe(true);
  });

  it('detects a live Hono apps/api package', () => {
    expect(structureHasHonoApi(honoApiLayer())).toBe(true);
  });

  it('detects leftover Hono source after the API manifest is removed', () => {
    const withoutManifest: IStructure = [
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
                name: 'index.ts',
                content: 'import { Hono } from "hono";\n',
              },
            ],
          },
        ],
      },
    ];
    expect(structureHasHonoApi(withoutManifest)).toBe(true);
  });
});
