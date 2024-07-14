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

const createAPICalls = (tables: IRelationshipInfo[]): void => {
  const templatePath = path.resolve(
    __dirname,
    '../templates/frontend/apiCalls.ts.txt',
  );
  const template = fs.readFileSync(templatePath, 'utf-8');
  const outputDir = path.resolve(__dirname, '../output/frontend/api');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  } else {
    clearDirectory(outputDir);
  }

  // Copy customFetch.ts to the output directory
  const customFetchSourcePath = path.resolve(__dirname, '../templates/frontend/customFetch.ts');
  const customFetchDestinationPath = path.join(outputDir, 'customFetch.ts');
  fs.copyFileSync(customFetchSourcePath, customFetchDestinationPath);

  tables.forEach(({ table }) => {
    const className = toPascalCase(table);
    const camelCaseClassName =
      className.charAt(0).toLowerCase() + className.slice(1);
    let apiCalls = template;

    apiCalls = apiCalls.replace(/{{className}}/g, className);
    apiCalls = apiCalls.replace(/{{camelCaseClassName}}/g, camelCaseClassName);
    apiCalls = apiCalls.replace(/{{route}}/g, table);

    const outputFilePath = path.join(outputDir, `${className}API.ts`);
    fs.writeFileSync(outputFilePath, apiCalls);
  });
};

export default createAPICalls;
