import { IStructure } from '@/components/FileViewer.tsx';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { getPrimaryKey } from '@/utils/common.ts';

// New API for getLaravelStructure
export default ({
  tableInfo,
  schemaInfo,
}: {
  tableInfo: ISchemaInfo;
  schemaInfo: ISchemaInfo[];
}) =>
  [
    {
      type: 'folder',
      name: 'app',
      files: [
        {
          type: 'file',
          name: '{{tableName}}-{{relatedTableName}}-{{pivotTableName}}.ts',
          content: `
        <?php

namespace App\\Models;

{{modelImports}}
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class {{className}} extends Model
{
    use HasFactory;

    protected $table = '{{tableName}}';

    {{primaryKey}}

    {{hiddenColumns}}

    protected $fillable = [
        {{fillable}}
    ];

    {{relationships}}
}
`,
          subContent: [
            {
              primaryKey: getPrimaryKey({
                tableName: tableInfo.tableName,
                schemaInfo,
              }),
              relationships: schemaInfo
                .map((schema) => JSON.stringify(schema, null, 4))
                .join(),
            },
          ],
        },
      ],
    },
  ] satisfies IStructure;
