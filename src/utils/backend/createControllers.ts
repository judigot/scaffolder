import fs from 'fs';
import path from 'path';
import { APP_SETTINGS, frameworkDirectories } from '@/constants';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';

// Global variables
const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const getOwnerComment = (extension: string): string =>
  ({
    '.php': '/* Owner: App Scaffolder */\n',
  })[extension] ?? '/* Owner: App Scaffolder */\n';

const createControllerMethods = ({
  tableName,
  schemaInfo,
}: {
  tableName: string;
  schemaInfo: ISchemaInfo[];
}): string => {
  const model = toPascalCase(tableName);
  const modelLowercase = model.toLowerCase();
  const repositoryVariable = `${modelLowercase}Repository`;

  const modelSpecificMethods = generateModelSpecificMethods({
    targetTable: tableName,
    schemaInfo,
    fileToGenerate: 'controllerMethod',
  });

  return `
      protected $repository;
  
      public function __construct(${model}Interface $${repositoryVariable})
      {
          $this->repository = $${repositoryVariable};
      }

      ${modelSpecificMethods}
    `;
};

const createControllerFile = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template,
  );

const createControllers = (
  schemaInfo: ISchemaInfo[],
  framework: keyof typeof frameworkDirectories,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  schemaInfo.forEach(({ table, isPivot }) => {
    // Skip pivot tables if necessary
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const templatePath = path.resolve(
      __dirname,
      `../../templates/backend/${framework}/controller.txt`,
    );
    const template = fs.readFileSync(templatePath, 'utf-8');
    const className = toPascalCase(table);

    const controllerMethods = createControllerMethods({
      tableName: table,
      schemaInfo,
    });
    const replacements = {
      className,
      controllerMethods,
    };
    const controller = createControllerFile(template, replacements);
    const ownerComment = getOwnerComment('.php');
    const controllerWithComment = controller.replace(
      '<?php',
      `<?php\n${ownerComment}`,
    );

    const outputFilePath = path.join(outputDir, `${className}Controller.php`);
    fs.writeFileSync(outputFilePath, controllerWithComment);
  });
};

export default createControllers;
