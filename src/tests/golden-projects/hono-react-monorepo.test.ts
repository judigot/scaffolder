import { describe, expect, it } from 'vitest';
import type { IStructure } from '@/components/FileViewer.tsx';
import { generateAuthFoundation } from '@/tests/helpers/authFoundation.ts';

function flatten(structure: IStructure, prefix = ''): Map<string, string> {
  const files = new Map<string, string>();
  for (const item of structure) {
    const path = prefix + item.name;
    if (item.type === 'file') {
      files.set(path, item.content);
    } else {
      for (const [name, content] of flatten(item.children, `${path}/`)) {
        files.set(name, content);
      }
    }
  }
  return files;
}

describe('Hono monorepo auth foundation', () => {
  it('adds complete auth without replacing runtime adapters or unrelated apps', async () => {
    const sentinel = 'export const preserved = true;\n';
    const base: IStructure = [
      {
        type: 'file',
        name: 'package.json',
        content: '{"name":"starter","private":true}',
      },
      {
        type: 'file',
        name: 'Dockerfile',
        content: 'RUN bun build apps/api/src/index.ts\n',
      },
      {
        type: 'folder',
        name: 'apps',
        children: [
          {
            type: 'folder',
            name: 'api',
            children: [
              {
                type: 'folder',
                name: 'src',
                children: [
                  { type: 'file', name: 'index.ts', content: sentinel },
                  { type: 'file', name: 'vercel.ts', content: sentinel },
                ],
              },
            ],
          },
          {
            type: 'folder',
            name: 'vite',
            children: [{ type: 'file', name: 'package.json', content: '{}' }],
          },
          {
            type: 'folder',
            name: 'nextjs',
            children: [{ type: 'file', name: 'package.json', content: '{}' }],
          },
        ],
      },
    ];
    const result = await generateAuthFoundation(base);
    expect(result.hasErrors).not.toBe(true);
    expect(result.filesFailedToFormat).toEqual([]);
    const files = flatten(result.structure);
    expect(files.get('package.json')).toBe('{"name":"starter","private":true}');
    expect(files.get('apps/api/src/index.ts')).toBe(sentinel);
    expect(files.get('apps/api/src/vercel.ts')).toBe(sentinel);
    expect(files.get('Dockerfile')).toBe(
      'RUN bun build apps/api/src/index.ts\n',
    );
    expect(files.get('apps/vite/package.json')).toBe('{}');
    expect(files.get('apps/nextjs/package.json')).toBe('{}');
    expect(files.get('apps/api/src/auth/index.ts')).toContain('betterAuth');
    expect(files.get('apps/api/src/app.ts')).toContain('export default app;');
    expect(
      JSON.parse(files.get('apps/api/tsconfig.json') ?? '{}'),
    ).toMatchObject({
      compilerOptions: {
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
        rewriteRelativeImportExtensions: true,
      },
    });
    expect(JSON.parse(files.get('apps/api/vercel.json') ?? '{}')).toEqual({
      $schema: 'https://openapi.vercel.sh/vercel.json',
      framework: 'hono',
    });
    const schema = files.get('apps/api/src/db/schema.ts') ?? '';
    for (const field of ['emailVerified', 'token', 'account', 'verification']) {
      expect(schema).toContain(field);
    }
    expect(schema).not.toContain('hashedPassword');
    expect(files.get('apps/api/test/auth.test.ts')).not.toContain('skipIf');
    expect(
      [...files.keys()].some(
        (path) => path.startsWith('api/') || path.startsWith('src/'),
      ),
    ).toBe(false);
  });
});
