import { frameworkDirectories } from '@/constants';
import fs from 'fs';
import path from 'path';

const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

interface IColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  primary_key: boolean;
  unique: boolean;
}

interface IRelationshipInfo {
  table: string;
  columnsInfo: IColumnInfo[];
  foreignTables: string[];
  foreignKeys: string[];
  childTables: string[];
}

const toPascalCase = (str: string): string => {
  return str
    .replace(/_./g, (match) => match[1].toUpperCase())
    .replace(/^(.)/, (match) => match.toUpperCase());
};

const clearDirectory = (directory: string): void => {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file) => {
      const filePath = path.join(directory, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
  }
};

const generateModel = (
  tables: IRelationshipInfo[],
  framework: keyof typeof frameworkDirectories,
): void => {
  const frameworkDir = frameworkDirectories[framework];

  const templatePath = path.resolve(
    __dirname,
    `../templates/${framework}/model.txt`,
  );
  const template = fs.readFileSync(templatePath, 'utf-8');
  const outputDir = path.resolve(__dirname, `../out/${frameworkDir.model}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  } else {
    clearDirectory(outputDir);
  }

  tables.forEach(({ table, columnsInfo, foreignKeys, childTables }) => {
    const className = toPascalCase(table);
    const fillable = columnsInfo
      .map(({ column_name }) => `'${column_name}'`)
      .join(',\n        ');

    let relationships = '';
    foreignKeys.forEach((foreignKey) => {
      relationships += `    public function ${foreignKey}()\n    {\n        return $this->belongsTo(${toPascalCase(foreignKey)}::class, '${foreignKey}');\n    }\n\n`;
    });

    childTables.forEach((childTable) => {
      relationships += `    public function ${childTable}s()\n    {\n        return $this->hasMany(${toPascalCase(childTable)}::class);\n    }\n\n`;
    });

    let model = template;
    model = model.replace(/{{className}}/g, className);
    model = model.replace(/{{tableName}}/g, table);
    model = model.replace(/{{fillable}}/g, fillable);
    model = model.replace(/{{relationships}}/g, relationships.trim());

    const outputFilePath = path.join(outputDir, `${className}.php`);
    fs.writeFileSync(outputFilePath, model);
  });
};

export default generateModel;
