import fs from 'fs';
import path from 'path';
import clearDirectory from './clearDirectory';

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

const createAPICalls = (tables: IRelationshipInfo[]): void => {
  const templateDir = path.resolve(__dirname, '../templates/frontend/api');
  const outputDir = path.resolve(__dirname, '../../output/frontend/api');

  if (fs.existsSync(outputDir)) {
    clearDirectory(outputDir);
    fs.rmdirSync(outputDir);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Copy customFetch.ts to the output directory
  const customFetchSourcePath = path.resolve(templateDir, 'customFetch.ts');
  const customFetchDestinationPath = path.join(outputDir, 'customFetch.ts');
  fs.copyFileSync(customFetchSourcePath, customFetchDestinationPath);

  const operations = ['create', 'read', 'update', 'delete'];
  const operationTemplates: Record<string, string> = {};

  operations.forEach((operation) => {
    const templatePath = path.resolve(templateDir, `model/${operation}.ts`);
    operationTemplates[operation] = fs.readFileSync(templatePath, 'utf-8');
  });

  tables.forEach(({ table }) => {
    const className = toPascalCase(table);
    const tableDir = path.join(outputDir, table);

    if (!fs.existsSync(tableDir)) {
      fs.mkdirSync(tableDir, { recursive: true });
    }

    operations.forEach((operation) => {
      let apiCalls = operationTemplates[operation];
      apiCalls = apiCalls.replace(/{{className}}/g, className);
      apiCalls = apiCalls.replace(/{{route}}/g, table);

      const outputFilePath = path.join(tableDir, `${operation}-${table}.ts`);
      fs.writeFileSync(outputFilePath, apiCalls);
    });
  });
};

export default createAPICalls;
