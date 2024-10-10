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

const createRepositories = (
  schemaInfo: ISchemaInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const repoTemplatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/repository.txt`,
  );
  const repoTemplate = fs.existsSync(repoTemplatePath)
    ? fs.readFileSync(repoTemplatePath, 'utf-8')
    : null;

  if (repoTemplate == null) {
    console.error(`Template not found: ${repoTemplatePath}`);
    return;
  }

  schemaInfo.forEach((tableInfo) => {
    const {
      table,
      tableCases: { pascalCase },
      isPivot,
    } = tableInfo;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const modelSpecificMethods = generateModelSpecificMethods({
      targetTable: table,
      schemaInfo,
      fileToGenerate: 'repository',
    });
    const modelImports = generateModelImports(tableInfo);

    const content = createFile(repoTemplate, {
      ownerComment,
      className: pascalCase,
      modelName: pascalCase,
      tableName: table,
      modelSpecificMethods,
      modelImports,
    });

    const outputFilePath = path.join(outputDir, `${pascalCase}Repository.php`);
    fs.writeFileSync(outputFilePath, content);
  });
};

export default createRepositories;
