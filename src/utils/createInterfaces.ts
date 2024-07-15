import fs from 'fs';
import path from 'path';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import { toPascalCase } from '@/helpers/toPascalCase';

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
  tables: IRelationshipInfo[],
  framework: string,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  tables.forEach(({ table }) => {
    const className = toPascalCase(table);
    const replacements = {
      ownerComment: getOwnerComment(),
      className,
      modelName: className,
      tableName: table,
    };

    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/repositoryInterface.txt`,
    );
    if (fs.existsSync(templatePath)) {
      const template = fs.readFileSync(templatePath, 'utf-8');
      const content = createFile(template, replacements);
      const outputFilePath = path.join(
        outputDir,
        `${className}RepositoryInterface.php`,
      );
      fs.writeFileSync(outputFilePath, content);
    } else {
      console.error(`Template not found: ${templatePath}`);
    }
  });
};

export default createInterfaces;
