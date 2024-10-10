import fs from 'fs';
import path from 'path';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { generateModelImports } from '@/utils/common';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { createFile } from '@/utils/backend/laravel/createBaseFile';

// Global variables
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (process.platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const createInterfaces = (
  schemaInfo: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const templatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/repository-interface.txt`,
  );

  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  schemaInfo.forEach((tableInfo) => {
    const { table, isPivot } = tableInfo;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const className =
      schemaInfo.find((rel) => rel.table === table)?.tableCases.pascalCase ??
      null;
    if (className != null) {
      const modelImports = generateModelImports(tableInfo);

      const replacements = {
        ownerComment,
        className,
        modelName: className,
        tableName: table,
        modelSpecificMethods: generateModelSpecificMethods({
          targetTable: table,
          schemaInfo,
          fileToGenerate: 'interface',
        }),
        modelImports,
      };

      const content = createFile(template, replacements);
      const outputFilePath = path.join(outputDir, `${className}Interface.php`);
      fs.writeFileSync(outputFilePath, content);
    }
  });
};

export default createInterfaces;
