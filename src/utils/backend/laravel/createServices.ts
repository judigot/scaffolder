import fs from 'fs';
import path from 'path';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { createFile } from '@/helpers/stringHelper';

// Determine the current directory based on platform
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

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

    const content = createFile({template, replacements});
    const outputFilePath = path.join(outputDir, `${pascalCase}Service.php`);
    fs.writeFileSync(outputFilePath, content);
  });
};

export default createServices;
