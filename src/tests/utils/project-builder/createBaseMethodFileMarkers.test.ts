import { describe, expect, it } from 'vitest';
import { createBaseMethodFile } from '@/utils/project-builder/project-processors/createBaseMethodFile.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

describe('base-method canonical placeholders', () => {
  it('resolves method names and dotted table transforms in paths and content', async () => {
    const files: IStructure = [
      {
        type: 'folder',
        name: 'BaseMethods',
        children: [
          {
            type: 'folder',
            name: 'find',
            children: [
              { type: 'file', name: 'methodName.txt', content: 'findById' },
              {
                type: 'file',
                name: 'resourceHook.txt',
                content:
                  'export const <@@>methodNamePascalCase</@@><@@>tableName.singular.pascalCase</@@> = true;',
              },
            ],
          },
        ],
      },
    ];
    const table: ISchemaInfo = {
      tableName: 'posts',
      columnsInfo: [
        {
          column_name: 'id',
          data_type: 'uuid',
          primary_key: true,
          is_nullable: 'NO',
        },
      ],
    };
    const generated = await createBaseMethodFile(
      'use<@@>methodNamePascalCase</@@><@@>tableName.singular.pascalCase</@@>.ts --scoped --template /BaseMethods/**/resourceHook.txt',
      files,
      '/Projects/example/structure.yaml',
      [table],
      getSchemaInfo([table]),
      table,
    );
    expect(generated).toHaveLength(1);
    const file = generated.at(0);
    expect(file?.name).toBe('useFindByIdPost.ts');
    if (file?.type !== 'file') {
      throw new Error('Expected a generated hook file');
    }
    expect(file.content).toContain('export const FindByIdPost = true;');
  });
});
