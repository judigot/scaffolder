import fs from 'fs';
import path from 'path';
import { frameworkDirectories } from '@/constants';
import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

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

const createControllerMethods = (tableName: string): string => {
  const className = toPascalCase(tableName);
  const variableName = className.toLowerCase();
  const repositoryVariable = `${variableName}Repository`;

  return `
    protected $${repositoryVariable};

    public function __construct(${className}RepositoryInterface $${repositoryVariable})
    {
        $this->${repositoryVariable} = $${repositoryVariable};
    }

    public function index()
    {
        $${variableName}s = $this->${repositoryVariable}->getAll();
        return response()->json($${variableName}s);
    }

    public function show($id)
    {
        $${variableName} = $this->${repositoryVariable}->findById($id);
        if ($${variableName}) {
            return response()->json($${variableName});
        }
        return response()->json(['message' => '${className} not found'], 404);
    }

    public function store(Request $request)
    {
        $${variableName} = $this->${repositoryVariable}->create($request->all());
        return response()->json($${variableName}, 201);
    }

    public function update(Request $request, $id)
    {
        $updated = $this->${repositoryVariable}->update($id, $request->all());
        if ($updated) {
            return response()->json(['message' => '${className} updated']);
        }
        return response()->json(['message' => '${className} not found'], 404);
    }

    public function destroy($id)
    {
        $deleted = $this->${repositoryVariable}->delete($id);
        if ($deleted) {
            return response()->json(['message' => '${className} deleted']);
        }
        return response()->json(['message' => '${className} not found'], 404);
    }
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

  schemaInfo.forEach(({ table }) => {
    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/controller.txt`,
    );
    const template = fs.readFileSync(templatePath, 'utf-8');
    const className = toPascalCase(table);

    const controllerMethods = createControllerMethods(table);
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
