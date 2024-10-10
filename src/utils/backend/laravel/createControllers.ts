import fs from 'fs';
import path from 'path';
import { APP_SETTINGS, frameworkDirectories, ownerComment } from '@/constants';
import { ISchemaInfo } from '@/interfaces/interfaces';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { changeCase } from '@/utils/identifySchema';
import { createFile } from '@/utils/backend/laravel/createBaseFile';

// Global variables
const platform: string = process.platform;

let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));
if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const createControllerMethods = ({
  tableName,
  schemaInfo,
}: {
  tableName: string;
  schemaInfo: ISchemaInfo[];
}): string => {
  const model = changeCase(tableName).pascalCase;
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

const createControllers = (
  schemaInfo: ISchemaInfo[],
  framework: keyof typeof frameworkDirectories,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const templatePath = path.resolve(
    __dirname,
    `../../../templates/backend/${framework}/controller.txt`,
  );
  const template = fs.readFileSync(templatePath, 'utf-8');

  schemaInfo.forEach(({ table, isPivot }) => {
    // Skip pivot tables if necessary
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const className = schemaInfo.find((rel) => rel.table === table)?.tableCases
      .pascalCase;
    if (className == null) return;

    const controllerMethods = createControllerMethods({
      tableName: table,
      schemaInfo,
    });
    const content = createFile(template, {
      ownerComment,
      className,
      controllerMethods,
    });

    const outputFilePath = path.join(outputDir, `${className}Controller.php`);
    fs.writeFileSync(outputFilePath, content);
  });
};

export default createControllers;
