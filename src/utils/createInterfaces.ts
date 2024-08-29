import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { generateModelImports } from '@/utils/common';
import { APP_SETTINGS } from '@/constants';

// Global variables
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

const createFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

const createInterfaces = (
  schemaInfo: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  schemaInfo.forEach((tableInfo) => {
    const { table, isPivot } = tableInfo;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const className = toPascalCase(table);
    const modelSpecificMethods = generateModelSpecificMethods({
      targetTable: table, // Pass the table name as targetTable
      schemaInfo,
      fileToGenerate: 'interface',
    });
    const modelImports = generateModelImports(tableInfo);

    const replacements = {
      ownerComment: getOwnerComment(),
      className,
      modelName: className,
      tableName: table,
      modelSpecificMethods,
      modelImports,
    };

    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/repository-interface.txt`,
    );
    if (fs.existsSync(templatePath)) {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const content = createFile(template, replacements);
      const outputFilePath = path.join(outputDir, `${className}Interface.php`);
      fs.writeFileSync(outputFilePath, content);
    } else {
      console.error(`Template not found: ${templatePath}`);
    }
  });
};

export default createInterfaces;
