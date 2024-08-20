import fs from 'fs';
import path from 'path';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { generateModelImports } from '@/utils/generateModelImports';

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

  schemaInfo.forEach((tableInfo) => {
    const className = toPascalCase(tableInfo.table);
    const modelSpecificMethods = generateModelSpecificMethods({
      schemaInfo: tableInfo,
      fileToGenerate: 'repository',
    });
    const modelImports = generateModelImports(tableInfo);

    // Create Repository
    const repoTemplatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/repository.txt`,
    );
    if (fs.existsSync(repoTemplatePath)) {
      const repoTemplate = fs.readFileSync(repoTemplatePath, 'utf-8');
      const repoContent = createFile(repoTemplate, {
        ownerComment: getOwnerComment(),
        className,
        modelName: className,
        tableName: tableInfo.table,
        modelSpecificMethods,
        modelImports,
      });
      const repoOutputFilePath = path.join(
        outputDir,
        `${className}Repository.php`,
      );
      fs.writeFileSync(repoOutputFilePath, repoContent);
    } else {
      console.error(`Template not found: ${repoTemplatePath}`);
    }
  });
};

export default createRepositories;
