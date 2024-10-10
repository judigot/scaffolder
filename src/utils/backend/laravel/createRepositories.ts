import fs from 'fs';
import path from 'path';
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

    const repoContent = createFile(repoTemplate, {
      ownerComment: getOwnerComment(),
      className: pascalCase,
      modelName: pascalCase,
      tableName: table,
      modelSpecificMethods,
      modelImports,
    });

    const repoOutputFilePath = path.join(
      outputDir,
      `${pascalCase}Repository.php`,
    );
    fs.writeFileSync(repoOutputFilePath, repoContent);
  });
};

export default createRepositories;
