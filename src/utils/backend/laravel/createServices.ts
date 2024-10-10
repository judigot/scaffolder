import fs from 'fs';
import path from 'path';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';

// Determine the current directory based on platform
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

// Function to get the owner comment

// Function to create the service file content by replacing placeholders with actual values
const createServiceFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

// Function to create the services based on the provided relationships and framework
const createServices = (
  schemaInfo: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const templatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/service.txt`,
  );
  const template = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, 'utf-8')
    : null;

  if (template == null) {
    console.error(`Template not found: ${templatePath}`);
    return;
  }

  schemaInfo.forEach(({ table, tableCases: { pascalCase }, isPivot }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const replacements = {
      ownerComment,
      className: pascalCase,
      modelName: pascalCase,
      tableName: table,
    };

    const content = createServiceFile(template, replacements);
    const outputFilePath = path.join(outputDir, `${pascalCase}Service.php`);
    fs.writeFileSync(outputFilePath, content);
  });
};

export default createServices;
