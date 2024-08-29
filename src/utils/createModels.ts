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

const filterAndMapColumns = (
  columns: IColumnInfo[],
  exemptions: string[],
  foreignKeys: string[],
): string[] =>
  columns
    .filter((column) => !exemptions.includes(column.column_name))
    .map((column) => column.column_name)
    .concat(foreignKeys)
    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

const createFillable = (
  columnsInfo: IColumnInfo[],
  foreignKeys: string[],
): string =>
  filterAndMapColumns(
    columnsInfo,
    [
      ...columnsInfo
        .filter((col) => col.primary_key)
        .map((col) => col.column_name),
      ...fillableExemptions,
    ],
    foreignKeys,
  )
    .map((column) => `'${column}'`)
    .join(',\n        ');

const generateRelationMethods = (
  relatedTables: string[],
  callback: (table: string) => string,
): string =>
  relatedTables
    .map((relatedTable) => callback(relatedTable))
    .filter(Boolean)
    .join('\n');

const createRelationships = (
  tableName: string,
  foreignKeys: string[],
  hasOne: string[],
  belongsToMany: string[],
  tables: ISchemaInfo[],
): string => {
  const getPrimaryKey = (table: string) =>
    tables
      .find((tbl) => tbl.table === table)
      ?.columnsInfo.find((col) => col.primary_key)?.column_name;

  const parentPrimaryKey = getPrimaryKey(tableName);

  const belongsToRelations = generateRelationMethods(
    foreignKeys,
    (foreignKey) =>
      `    public function ${foreignKey.replace('_id', '')}()\n    {\n        return $this->belongsTo(${toPascalCase(
        foreignKey.replace('_id', ''),
      )}::class, '${foreignKey}');\n    }\n`,
  );

  const hasManyRelations = generateRelationMethods(
    tables
      .find((table) => table.table === tableName)
      ?.hasMany.filter((relatedTable) => {
        const relatedTableInfo = tables.find(
          (table) => table.table === relatedTable,
        );
        return (
          relatedTableInfo?.pivotRelationships.some(
            (pivot) => pivot.relatedTable === tableName,
          ) ?? !(relatedTableInfo?.isPivot ?? false)
        );
      }) ?? [],
    (relatedTable) => {
      const relatedTablePlural = tables.find(
        (tbl) => tbl.table === relatedTable,
      )?.tablePlural;
      const childPrimaryKey = getPrimaryKey(relatedTable);

      return childPrimaryKey != null && parentPrimaryKey != null
        ? `    public function ${String(relatedTablePlural)}()\n    {\n        return $this->hasMany(${toPascalCase(
            relatedTable,
          )}::class, '${parentPrimaryKey}');\n    }\n`
        : '';
    },
  );

  const hasOneRelations = generateRelationMethods(
    hasOne,
    (relatedTable) =>
      `    public function ${relatedTable}()\n    {\n        return $this->hasOne(${toPascalCase(
        relatedTable,
      )}::class, '${String(parentPrimaryKey)}');\n    }\n`,
  );

  const belongsToManyRelations = generateRelationMethods(
    belongsToMany,
    (relatedTable) => {
      const relatedTableClass = toPascalCase(relatedTable);
      const relatedTablePlural = tables.find(
        (tbl) => tbl.table === relatedTable,
      )?.tablePlural;
      const junctionTable = tables.find(
        (tbl) =>
          tbl.foreignTables.includes(relatedTable) &&
          tbl.foreignTables.includes(tableName),
      )?.table;

      if (junctionTable == null) {
        throw new Error(
          `Junction table not found for ${tableName} and ${relatedTable}`,
        );
      }

      const currentTableForeignKey = `${tableName}_id`;
      const relatedTableForeignKey = `${relatedTable}_id`;

      return `    public function ${String(relatedTablePlural)}()\n    {\n        return $this->belongsToMany(${relatedTableClass}::class, '${junctionTable}', '${currentTableForeignKey}', '${relatedTableForeignKey}');\n    }\n`;
    },
  );

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
  return Array.from(new Set(relatedTables))
    .sort((a, b) => a.localeCompare(b))
    .map((table) => `use App\\Models\\${toPascalCase(table)};`)
    .join('\n');
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
        `../templates/backend/${framework}/model.txt`,
      );
      const template = fs.readFileSync(templatePath, 'utf-8');
      const className = toPascalCase(table);

      const fillable = createFillable(columnsInfo, foreignKeys);
      const relationships = createRelationships(
        table,
        foreignKeys,
        hasOne,
        belongsToMany,
        schemaInfo,
      );
      const primaryKeyName =
        columnsInfo.find((column) => column.primary_key)?.column_name ?? 'id';
      const primaryKey =
        primaryKeyName !== 'id'
          ? `protected $primaryKey = '${String(primaryKeyName)}';`
          : '';

      const modelImports = generateModelImports(
        hasOne,
        hasMany,
        belongsToMany,
        foreignKeys,
      );

      const model = createModelFile(template, {
        className,
        tableName: table,
        fillable,
        relationships,
        primaryKey,
        modelImports,
      });

      const modelWithComment = model.replace(
        '<?php',
        `<?php\n${getOwnerComment('.php')}`,
      );
      fs.writeFileSync(
        path.join(outputDir, `${className}.php`),
        modelWithComment,
      );
    },
  );
};

export default createModels;
