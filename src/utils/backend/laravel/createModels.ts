import fs from 'fs';
import path from 'path';
import { APP_SETTINGS, frameworkDirectories } from '@/constants';
import { snakeToCamelCase } from '@/helpers/stringHelper';
import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';
import { changeCase } from '@/utils/identifySchema';

// Global variables
const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const fillableExemptions = ['created_at', 'updated_at'];

const getOwnerComment = (extension: string): string =>
  ({
    '.php': '/* Owner: App Scaffolder */\n',
  })[extension] ?? '/* Owner: App Scaffolder */\n';

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
    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

  return fillableColumns.map((column) => `'${column}'`).join(',\n        ');
};

export const createRelationships = (
  tableName: string,
  foreignKeys: string[],
  hasOne: string[],
  belongsToMany: string[],
  tables: ISchemaInfo[],
): string => {
  const parentPrimaryKey = tables
    .find((table) => table.table === tableName)
    ?.columnsInfo.find((column) => column.primary_key)?.column_name;

  const belongsToRelations = foreignKeys
    .map((foreignKey) => {
      const relationshipName = foreignKey.replace('_id', '');
      return `    public function ${snakeToCamelCase(relationshipName)}()\n    {\n        return $this->belongsTo(${changeCase(relationshipName).pascalCase}::class, '${foreignKey}');\n    }\n`;
    })
    .join('\n');

  // Generate hasMany relationships based on the hasMany array and pivotRelationships
  const hasManyRelations = tables
    .find((table) => table.table === tableName)
    ?.hasMany.filter((relatedTable) => {
      const relatedTableInfo = tables.find(
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
      const childPrimaryKey = tables
        .find((table) => table.table === relatedTable)
        ?.columnsInfo.find((column) => column.primary_key)?.column_name;

      if (childPrimaryKey != null && parentPrimaryKey != null) {
        return `    public function ${snakeToCamelCase(relatedTable)}s()\n    {\n        return $this->hasMany(${changeCase(relatedTable).pascalCase}::class, '${parentPrimaryKey}');\n    }\n`;
      }
      return '';
    })
    .join('\n');

  const hasOneRelations = hasOne
    .map((relatedTable) => {
      const relatedTableClass = changeCase(relatedTable).pascalCase;
      return `    public function ${snakeToCamelCase(relatedTable)}()\n    {\n        return $this->hasOne(${relatedTableClass}::class, '${String(parentPrimaryKey)}');\n    }\n`;
    })
    .join('\n');

  const belongsToManyRelations = belongsToMany
    .map((relatedTable) => {
      const relatedTableClass = changeCase(relatedTable).pascalCase;

      // Find the junction table that references both the current table and the related table
      const junctionTable = tables.find(
        (table) =>
          table.foreignTables.includes(relatedTable) &&
          table.foreignTables.includes(tableName),
      )?.table;

      if (junctionTable == null) {
        throw new Error(
          `Junction table not found for ${tableName} and ${relatedTable}`,
        );
      }

      // Find the foreign keys in the junction table
      const currentTableForeignKey = `${tableName}_id`;
      const relatedTableForeignKey = `${relatedTable}_id`;

      return `    public function ${snakeToCamelCase(junctionTable)}s()\n    {\n        return $this->belongsToMany(${relatedTableClass}::class, '${junctionTable}', '${currentTableForeignKey}', '${relatedTableForeignKey}');\n    }\n`;
    })
    .join('\n');

  return [
    belongsToRelations,
    hasManyRelations, // Generate hasMany relationships correctly
    hasOneRelations,
    belongsToManyRelations,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
};

const createModelFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

const createModels = (
  schemaInfo: ISchemaInfo[],
  framework: keyof typeof frameworkDirectories,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const templatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/model.txt`,
  );
  const template = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf-8')
    : null;
  if (template == null) {
    console.error(`Template not found: ${templatePath}`);
    return;
  }

  schemaInfo.forEach((tableInfo) => {
    const {
      table,
      tableCases: { pascalCase },
      columnsInfo,
      foreignKeys,
      hasOne,
      hasMany,
      belongsToMany,
      isPivot,
    } = tableInfo;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

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

    const model = createModelFile(template, {
      className: pascalCase,
      tableName: table,
      fillable,
      relationships,
      primaryKey,
      modelImports,
    }).replace('<?php', `<?php\n${getOwnerComment('.php')}`);

    fs.writeFileSync(path.join(outputDir, `${pascalCase}.php`), model);
  });
};

export default createModels;
