import fs from 'fs';
import path from 'path';
import { APP_SETTINGS, frameworkDirectories } from '@/constants';
import { toPascalCase } from '@/helpers/toPascalCase';
import { IColumnInfo, ISchemaInfo } from '@/interfaces/interfaces';

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
      return `    public function ${relationshipName}()\n    {\n        return $this->belongsTo(${toPascalCase(relationshipName)}::class, '${foreignKey}');\n    }\n`;
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
        return `    public function ${relatedTable}s()\n    {\n        return $this->hasMany(${toPascalCase(relatedTable)}::class, '${parentPrimaryKey}');\n    }\n`;
      }
      return '';
    })
    .join('\n');

  const hasOneRelations = hasOne
    .map((relatedTable) => {
      const relatedTableClass = toPascalCase(relatedTable);
      return `    public function ${relatedTable}()\n    {\n        return $this->hasOne(${relatedTableClass}::class, '${String(parentPrimaryKey)}');\n    }\n`;
    })
    .join('\n');

  const belongsToManyRelations = belongsToMany
    .map((relatedTable) => {
      const relatedTableClass = toPascalCase(relatedTable);

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

      return `    public function ${relatedTable}s()\n    {\n        return $this->belongsToMany(${relatedTableClass}::class, '${junctionTable}', '${currentTableForeignKey}', '${relatedTableForeignKey}');\n    }\n`;
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

  schemaInfo.forEach(
    ({
      table,
      columnsInfo,
      foreignKeys,
      hasOne,
      hasMany,
      belongsToMany,
      isPivot,
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

      const templatePath = path.resolve(
        __dirname,
        `../../templates/backend/${framework}/model.txt`,
      );
      const template = fs.readFileSync(templatePath, 'utf-8');
      const className = toPascalCase(table);

      const fillable = createFillable(columnsInfo, foreignKeys);
      const relationships = createRelationships(
        table,
        foreignKeys,
        hasOne,
        // hasMany,
        belongsToMany,
        schemaInfo,
      );
      const primaryKeyName =
        columnsInfo.find((column) => column.primary_key)?.column_name ?? 'id';
      const primaryKey =
        primaryKeyName !== 'id'
          ? `protected $primaryKey = '${String(primaryKeyName)}';`
          : '';

      const generateModelImports = (
        hasOne: string[],
        hasMany: string[],
        belongsToMany: string[],
        foreignKeys: string[],
      ): string => {
        const relatedTables = [
          ...hasOne,
          ...hasMany,
          ...belongsToMany,
          ...foreignKeys.map((fk) => fk.replace('_id', '')),
        ];
        const uniqueRelatedTables = Array.from(new Set(relatedTables));

        // Sort the table names alphabetically
        uniqueRelatedTables.sort((a, b) => a.localeCompare(b));

        return uniqueRelatedTables
          .map((table) => `use App\\Models\\${toPascalCase(table)};`)
          .join('\n');
      };

      const modelImports = generateModelImports(
        hasOne,
        hasMany,
        belongsToMany,
        foreignKeys,
      );

      const replacements = {
        className,
        tableName: table,
        fillable,
        relationships,
        primaryKey,
        modelImports,
      };
      const model = createModelFile(template, replacements);
      const ownerComment = getOwnerComment('.php');
      const modelWithComment = model.replace('<?php', `<?php\n${ownerComment}`);

      const outputFilePath = path.join(outputDir, `${className}.php`);
      fs.writeFileSync(outputFilePath, modelWithComment);
    },
  );
};

export default createModels;
