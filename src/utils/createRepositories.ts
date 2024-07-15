import fs from 'fs';
import path from 'path';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import { toPascalCase } from '@/helpers/toPascalCase';

// Global variables
const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const getOwnerComment = (): string => '/* Owner: App Scaffolder */\n';

const createFile = (template: string, replacements: Record<string, string>): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

const createRepositories = (
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

    // Create Repository
    const repoTemplatePath = path.resolve(__dirname, `../templates/backend/${framework}/repository.txt`);
    if (fs.existsSync(repoTemplatePath)) {
      const repoTemplate = fs.readFileSync(repoTemplatePath, 'utf-8');
      const repoContent = createFile(repoTemplate, replacements);
      const repoOutputFilePath = path.join(outputDir, `${className}Repository.php`);
      fs.writeFileSync(repoOutputFilePath, repoContent);
    } else {
      console.error(`Template not found: ${repoTemplatePath}`);
    }

    // Create Repository Interface
    const repoInterfaceTemplatePath = path.resolve(__dirname, `../templates/backend/${framework}/repositoryInterface.txt`);
    if (fs.existsSync(repoInterfaceTemplatePath)) {
      const repoInterfaceTemplate = fs.readFileSync(repoInterfaceTemplatePath, 'utf-8');
      const repoInterfaceContent = createFile(repoInterfaceTemplate, replacements);
      const repoInterfaceOutputFilePath = path.join(outputDir, `${className}RepositoryInterface.php`);
      fs.writeFileSync(repoInterfaceOutputFilePath, repoInterfaceContent);
    } else {
      console.error(`Template not found: ${repoInterfaceTemplatePath}`);
    }
  });
};

export default createRepositories;
