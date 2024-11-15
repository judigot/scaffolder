import { APP_SETTINGS, ownerComment } from '@/constants';
import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { changeCase } from '@/utils/identifySchema';
import { getPrimaryKey } from '@/utils/common';
import { IFile } from '@/components/FileViewer';

const fillableExemptions = ['created_at', 'updated_at'];

const createFillable = (
  columnsInfo: IColumnInfo[],
  foreignKeys: string[],
): string => {
  const primaryKeyColumns = columnsInfo
    .filter((column) => column.primary_key)
    .map((column) => column.column_name);
  const fillableColumns = columnsInfo
    .filter(
      (column) =>
        !primaryKeyColumns.includes(column.column_name) &&
        !fillableExemptions.includes(column.column_name),
    )
    .map((column) => column.column_name)
    .concat(foreignKeys)
    .filter((value, index, self) => self.indexOf(value) === index);

  return fillableColumns.map((column) => `'${column}'`).join(',\n        ');
};

export const createRelationships = (
  tableName: string,
  foreignKeys: string[],
  hasOne: string[],
  belongsToMany: string[],
  schemaInfo: ISchemaInfo[],
): string => {
  const parentPrimaryKey = schemaInfo
    .find((table) => table.table === tableName)
    ?.columnsInfo.find((column) => column.primary_key)?.column_name;

  const belongsToRelations = foreignKeys
    .map((foreignKey) => {
      const relationshipName = foreignKey.replace('_id', '');
      return `    public function ${changeCase(relationshipName).camelCase}()\n    {\n        return $this->belongsTo(${changeCase(relationshipName).pascalCase}::class, '${foreignKey}');\n    }\n`;
    })
    .join('\n');

  const hasManyRelations = schemaInfo
    .find((table) => table.table === tableName)
    ?.hasMany.filter((relatedTable) => {
      const relatedTableInfo = schemaInfo.find(
        (table) => table.table === relatedTable,
      );
      return (
        (relatedTableInfo?.pivotRelationships.some(
          (pivot) => pivot.relatedTable === tableName,
        ) ??
          false) ||
        !(relatedTableInfo?.isPivot ?? false)
      );
    })
    .map((relatedTable) => {
      const childPrimaryKey = schemaInfo
        .find((table) => table.table === relatedTable)
        ?.columnsInfo.find((column) => column.primary_key)?.column_name;

      if (childPrimaryKey != null && parentPrimaryKey != null) {
        return `    public function ${changeCase(relatedTable).camelCase}s()\n    {\n        return $this->hasMany(${changeCase(relatedTable).pascalCase}::class, '${parentPrimaryKey}');\n    }\n`;
      }
      return '';
    })
    .join('\n');

  const hasOneRelations = hasOne
    .map((relatedTable) => {
      const relatedTableClass = changeCase(relatedTable).pascalCase;
      return `    public function ${changeCase(relatedTable).camelCase}()\n    {\n        return $this->hasOne(${relatedTableClass}::class, '${String(parentPrimaryKey)}');\n    }\n`;
    })
    .join('\n');

  const belongsToManyRelations = belongsToMany
    .map((relatedTable) => {
      const relatedTableClass = changeCase(relatedTable).pascalCase;
      const junctionTable = schemaInfo.find(
        (table) =>
          table.foreignTables.includes(relatedTable) &&
          table.foreignTables.includes(tableName),
      )?.table;

      if (junctionTable == null) {
        throw new Error(
          `Junction table not found for ${tableName} and ${relatedTable}`,
        );
      }

      const primaryKey = getPrimaryKey(tableName, schemaInfo);
      const relatedTableForeignKey = getPrimaryKey(relatedTable, schemaInfo);

      return `    public function ${changeCase(relatedTable).camelCase}s()\n    {\n        return $this->belongsToMany(${relatedTableClass}::class, '${junctionTable}', '${primaryKey}', '${relatedTableForeignKey}');\n    }\n`;
    })
    .join('\n');

  return [
    belongsToRelations,
    hasManyRelations,
    hasOneRelations,
    belongsToManyRelations,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
};

const createModels = (schemaInfo: ISchemaInfo[]): IFile[] => {
  return schemaInfo

    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const {
        table,
        tableCases: { pascalCase },
        columnsInfo,
        foreignKeys,
        hasOne,
        hasMany,
        belongsToMany,
      } = tableInfo;

      const fillable = createFillable(columnsInfo, foreignKeys);
      const relationships = createRelationships(
        table,
        foreignKeys,
        hasOne,
        belongsToMany,
        schemaInfo,
      );
      const primaryKey =
        columnsInfo.find((column) => column.primary_key)?.column_name !== 'id'
          ? `protected $primaryKey = '${String(columnsInfo.find((column) => column.primary_key)?.column_name)}';`
          : '';

      const modelImports = [
        ...new Set([
          ...hasOne,
          ...hasMany,
          ...belongsToMany,
          ...foreignKeys.map((fk) => fk.replace('_id', '')),
        ]),
      ]
        .sort()
        .map(
          (relatedTable) =>
            `use App\\Models\\${changeCase(relatedTable).pascalCase};`,
        )
        .join('\n');

      const template = `<?php
${ownerComment}

namespace App\\Models;

${modelImports}
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class ${pascalCase} extends Model
{
    use HasFactory;

    protected $table = '${table}';

    ${primaryKey}

    protected $fillable = [
        ${fillable}
    ];
    ${relationships}
}
`;

      return {
        type: 'file',
        name: `${pascalCase}.php`,
        content: template,
      };
    });
};

export default createModels;
