import { IStructure } from '@/components/FileViewer.tsx';
// import { ISchemaInfo } from '@/interfaces/interfaces.ts';

// New API for getLaravelStructure
export default () =>
  [
    {
      type: 'folder',
      name: 'Models',
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

    {{domainMethods}}
}
`,
          replacements: {
            primaryKey: `protected $primaryKey = '{{getPrimaryKey()}}';`,
            hiddenColumns: `protected $hidden = [{{getHiddenColumns()}}];`,
            fillable: `protected $fillable = [{{getRequiredColumns()}}];`,
            domainMethods: `{{getModelDomainMethods()}}`,
            modelImports: () => {
              return {
                hasOne: `{{loop("use App\\Models\\{{relatedTableNamePascalCase}}")}}`,
                hasMany: `{{loop("use App\\Models\\{{relatedTableNamePascalCase}}")}}`,
                belongsTo: `{{loop("use App\\Models\\{{relatedTableNamePascalCase}}")}}`,
                belongsToMany: `{{loop("use App\\Models\\{{relatedTableNamePascalCase}}")}}`,
                pivotRelationships: `{{loop("use App\\Models\\{{pivotTableNamePascalCase}}")}}`,
              };
            },
          },
        },
      ],
    },
  ] satisfies IStructure;
