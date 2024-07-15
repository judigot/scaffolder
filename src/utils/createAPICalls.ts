import fs from 'fs';
import path from 'path';
import { IRelationshipInfo } from '@/utils/identifyRelationships';

const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const toPascalCase = (str: string): string => {
  return str
    .replace(/_./g, (match) => match[1].toUpperCase())
    .replace(/^(.)/, (match) => match.toUpperCase());
};

const getOwnerComment = (extension: string): string => {
  const comments: Record<string, string> = {
    '.ts': '/* Owner: App Scaffolder */\n',
  };
  return comments[extension] || '/* Owner: App Scaffolder */\n';
};

const createAPICalls = (
  relationships: IRelationshipInfo[],
  outputDir: string,
): void => {
  const templateDir = path.resolve(__dirname, '../templates/frontend/api');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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

  relationships.forEach(({ table }) => {
    const className = toPascalCase(table);
    const tableDir = path.join(outputDir, table);

    if (!fs.existsSync(tableDir)) {
      fs.mkdirSync(tableDir, { recursive: true });
    }

    operations.forEach((operation) => {
      let apiCalls = operationTemplates[operation];
      apiCalls = apiCalls.replace(/ModelTemplate/g, className);
      apiCalls = apiCalls.replace(/modelTemplate/g, `${table}s`); // Pluralize resource

      const outputFilePath = path.join(tableDir, `${operation}-${table}.ts`);
      const ownerComment = getOwnerComment('.ts');
      fs.writeFileSync(outputFilePath, ownerComment + apiCalls);
    });
  });
};

export default createAPICalls;
