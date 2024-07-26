import fs from 'fs';
import path from 'path';
import { frameworkDirectories } from '@/constants';
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

const createRelationships = (
  tableName: string,
  foreignKeys: string[],
  hasOne: string[],
  hasMany: string[],
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

  const hasManyRelations = hasMany
    .map((childTable) => {
      const childPrimaryKey = tables
        .find((table) => table.table === childTable)
        ?.columnsInfo.find((column) => column.primary_key)?.column_name;
      if (childPrimaryKey != null && parentPrimaryKey != null) {
        return `    public function ${childTable}s()\n    {\n        return $this->hasMany(${toPascalCase(childTable)}::class, '${parentPrimaryKey}');\n    }\n`;
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

  return [belongsToRelations, hasManyRelations, hasOneRelations]
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
  tables: ISchemaInfo[],
  framework: keyof typeof frameworkDirectories,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  tables.forEach(({ table, columnsInfo, foreignKeys, hasOne, hasMany }) => {
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
      hasMany,
      tables,
    );
    const primaryKey =
      columnsInfo.find((column) => column.primary_key)?.column_name ?? 'id';
    const primaryKeyLine =
      primaryKey !== 'id'
        ? `protected $primaryKey = '${String(primaryKey)}';\n\n`
        : '';

    const replacements = {
      className,
      tableName: table,
      fillable,
      relationships,
      primaryKeyLine,
    };
    const model = createModelFile(template, replacements);
    const ownerComment = getOwnerComment('.php');
    const modelWithComment = model.replace('<?php', `<?php\n${ownerComment}`);

    const outputFilePath = path.join(outputDir, `${className}.php`);
    fs.writeFileSync(outputFilePath, modelWithComment);
  });
};

export default createModels;
