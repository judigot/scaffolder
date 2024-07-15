import fs from 'fs';
import path from 'path';
import { frameworkDirectories } from '@/constants';
import { IRelationshipInfo } from '@/utils/identifyRelationships';
import { toPascalCase } from '@/helpers/toPascalCase';

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
  return `
    public function index()
    {
        $${className.toLowerCase()}s = ${className}::all();
        return response()->json($${className.toLowerCase()}s);
    }

    public function show($id)
    {
        $${className.toLowerCase()} = ${className}::find($id);
        if ($${className.toLowerCase()}) {
            return response()->json($${className.toLowerCase()});
        }
        return response()->json(['message' => '${className} not found'], 404);
    }

    public function store(Request $request)
    {
        $${className.toLowerCase()} = ${className}::create($request->all());
        return response()->json($${className.toLowerCase()}, 201);
    }

    public function update(Request $request, $id)
    {
        $${className.toLowerCase()} = ${className}::find($id);
        if ($${className.toLowerCase()}) {
            $${className.toLowerCase()}->update($request->all());
            return response()->json($${className.toLowerCase()});
        }
        return response()->json(['message' => '${className} not found'], 404);
    }

    public function destroy($id)
    {
        $${className.toLowerCase()} = ${className}::find($id);
        if ($${className.toLowerCase()}) {
            $${className.toLowerCase()}->delete();
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
  tables: IRelationshipInfo[],
  framework: keyof typeof frameworkDirectories,
  outputDir: string,
): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  tables.forEach(({ table }) => {
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
