import { describe, expect, it } from 'vitest';
import type { IStructure } from '@/components/FileViewer.tsx';
import {
  stripHonoFromPackageJsonFiles,
  structureHasHonoApi,
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

    expect(structureHasHonoApi(stripped)).toBe(false);
  });

  it('detects a live Hono apps/api package', () => {
    expect(structureHasHonoApi(honoApiLayer())).toBe(true);
  });
});
