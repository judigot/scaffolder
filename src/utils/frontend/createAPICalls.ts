import { ISchemaInfo } from '@/interfaces/interfaces';
import fs from 'fs';
import path from 'path';

const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const getOwnerComment = (extension: string): string => {
  const comments: Record<string, string> = {
    '.ts': '/* Owner: App Scaffolder */\n',
  };
  return comments[extension] || '/* Owner: App Scaffolder */\n';
};

const createAPICalls = (
  schemaInfo: ISchemaInfo[],
  outputDir: string,
  outputOnSingleFile: boolean,
  backendUrl: string,
): void => {
  const templateDir = path.resolve(__dirname, '../../templates/frontend/api');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Define paths for customFetch
  const customFetchSourcePath = path.resolve(templateDir, 'customFetch.ts');
  const customFetchContent = fs.existsSync(customFetchSourcePath)
    ? fs.readFileSync(customFetchSourcePath, 'utf-8')
    : null;

  if (customFetchContent == null) {
    console.error(`Template not found: ${customFetchSourcePath}`);
    return;
  }

  const customFetchDestinationPath = path.join(outputDir, 'customFetch.ts');
  const modifiedContent = customFetchContent.replace(
    /\$BACKEND_URL/g,
    backendUrl,
  );
  fs.writeFileSync(customFetchDestinationPath, modifiedContent);

  const operations = ['create', 'read', 'update', 'delete'];
  const operationTemplates: Record<string, string> = {};

  // Load operation templates
  operations.forEach((operation) => {
    const templatePath = path.resolve(templateDir, `model/${operation}.ts`);
    const template = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf-8')
      : null;

    if (template == null) {
      console.error(`Template not found: ${templatePath}`);
      return;
    }

    operationTemplates[operation] = template;
  });

  schemaInfo.forEach(
    ({ table, tableCases: { plural, pascalCase }, columnsInfo }) => {
      const className = pascalCase;
      const tableDir = path.join(outputDir, table);

      if (!fs.existsSync(tableDir)) {
        fs.mkdirSync(tableDir, { recursive: true });
      }

      operations.forEach((operation) => {
        let apiCalls = operationTemplates[operation];
        apiCalls = apiCalls.replace(/ModelTemplate/g, className);
        apiCalls = apiCalls.replace(/modelTemplate/g, plural);

        // Find the primary key column
        const primaryKeyColumn = columnsInfo.find(
          (column) => column.primary_key,
        );
        apiCalls = apiCalls.replace(
          /\$PRIMARY_KEY/g,
          primaryKeyColumn ? primaryKeyColumn.column_name : '',
        );

        if (!outputOnSingleFile) {
          apiCalls = apiCalls.replace(/\/interfaces';/g, `/I${pascalCase}';`);
        }

        const outputFilePath = path.join(tableDir, `${operation}-${table}.ts`);
        const ownerComment = getOwnerComment('.ts');
        fs.writeFileSync(outputFilePath, ownerComment + apiCalls);
      });
    },
  );
};

export default createAPICalls;
