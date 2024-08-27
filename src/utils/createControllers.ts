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

  const modelSpecificMethods = (() => {
    const foundSchemaInfo = schemaInfo.find(
      (tableInfo) => tableInfo.table === tableName,
    );
    return foundSchemaInfo
      ? generateModelSpecificMethods({
          schemaInfo: foundSchemaInfo,
          fileToGenerate: 'controllerMethod',
        })
      : '';
  })();

  return `
      protected $${repositoryVariable};
  
      public function __construct(${model}Interface $${repositoryVariable})
      {
          $this->${repositoryVariable} = $${repositoryVariable};
      }
  
      public function index()
      {
          $${modelLowercase}s = $this->${repositoryVariable}->getAll();
          return response()->json($${modelLowercase}s);
      }
  
      public function show($id)
      {
          $${modelLowercase} = $this->${repositoryVariable}->findById($id);
          if ($${modelLowercase}) {
              return response()->json($${modelLowercase});
          }
          return response()->json(['message' => '${model} not found'], 404);
      }
  
      public function store(Request $request)
      {
          $${modelLowercase} = $this->${repositoryVariable}->create($request->all());
          return response()->json($${modelLowercase}, 201);
      }
  
      public function update(Request $request, $id)
      {
          $updated = $this->${repositoryVariable}->update($id, $request->all());
          if ($updated) {
              return response()->json(['message' => '${model} updated']);
          }
          return response()->json(['message' => '${model} not found'], 404);
      }
  
      public function destroy($id)
      {
          $deleted = $this->${repositoryVariable}->delete($id);
          if ($deleted) {
              return response()->json(['message' => '${model} deleted']);
          }
          return response()->json(['message' => '${model} not found'], 404);
      }
  
      // Additional Methods
  
      public function findByAttributes(Request $request)
      {
          $attributes = $request->all();
          $${modelLowercase} = $this->${repositoryVariable}->findByAttributes($attributes);
          if ($${modelLowercase}) {
              return response()->json($${modelLowercase});
          }
          return response()->json(['message' => '${model} not found'], 404);
      }
  
      public function paginate(Request $request)
      {
          $perPage = $request->input('per_page', 15);
          $${modelLowercase}s = $this->${repositoryVariable}->paginate($perPage);
          return response()->json($${modelLowercase}s);
      }
  
      public function search(Request $request)
      {
          $query = $request->input('query');
          $fields = $request->input('fields', []);
          $perPage = $request->input('per_page', 15);
          $results = $this->${repositoryVariable}->search($query, $fields, $perPage);
          return response()->json($results);
      }
  
      public function count(Request $request)
      {
          $criteria = $request->all();
          $count = $this->${repositoryVariable}->count($criteria);
          return response()->json(['count' => $count]);
      }
  
      public function getWithRelations(Request $request)
      {
          $relations = $request->input('relations', []);
          $${modelLowercase}s = $this->${repositoryVariable}->getWithRelations($relations);
          return response()->json($${modelLowercase}s);
      }
  
      public function findOrFail($id)
      {
          $${modelLowercase} = $this->${repositoryVariable}->findOrFail($id);
          return response()->json($${modelLowercase});
      }
  
      public function updateOrCreate(Request $request)
      {
          $attributes = $request->input('attributes', []);
          $values = $request->input('values', []);
          $${modelLowercase} = $this->${repositoryVariable}->updateOrCreate($attributes, $values);
          return response()->json($${modelLowercase});
      }
  
      public function softDelete($id)
      {
          $softDeleted = $this->${repositoryVariable}->softDelete($id);
          if ($softDeleted) {
              return response()->json(['message' => '${model} soft-deleted']);
          }
          return response()->json(['message' => '${model} not found'], 404);
      }
  
      public function restore($id)
      {
          $restored = $this->${repositoryVariable}->restore($id);
          if ($restored) {
              return response()->json(['message' => '${model} restored']);
          }
          return response()->json(['message' => '${model} not found'], 404);
      }
  
      public function batchUpdate(Request $request)
      {
          $criteria = $request->input('criteria', []);
          $data = $request->input('data', []);
          $updated = $this->${repositoryVariable}->batchUpdate($criteria, $data);
          return response()->json(['updated' => $updated]);
      }
  
      public function exists(Request $request)
      {
          $criteria = $request->all();
          $exists = $this->${repositoryVariable}->exists($criteria);
          return response()->json(['exists' => $exists]);
      }
  
      public function pluck(Request $request)
      {
          $column = $request->input('column');
          $key = $request->input('key', null);
          $values = $this->${repositoryVariable}->pluck($column, $key);
          return response()->json($values);
      }
  
      public function firstOrCreate(Request $request)
      {
          $attributes = $request->input('attributes', []);
          $values = $request->input('values', []);
          $${modelLowercase} = $this->${repositoryVariable}->firstOrCreate($attributes, $values);
          return response()->json($${modelLowercase});
      }
  
      public function firstOrNew(Request $request)
      {
          $attributes = $request->input('attributes', []);
          $values = $request->input('values', []);
          $${modelLowercase} = $this->${repositoryVariable}->firstOrNew($attributes, $values);
          return response()->json($${modelLowercase});
      }
  
      public function chunk(Request $request)
      {
          $size = $request->input('size', 100);
          $callback = function ($${modelLowercase}s) {
              return response()->json($${modelLowercase}s);
          };
          $this->${repositoryVariable}->chunk($size, $callback);
      }
  
      public function each()
      {
          $callback = function ($${modelLowercase}) {
              return response()->json($${modelLowercase});
          };
          $this->${repositoryVariable}->each($callback);
      }
  
      public function random(Request $request)
      {
          $count = $request->input('count', 1);
          $${modelLowercase}s = $this->${repositoryVariable}->random($count);
          return response()->json($${modelLowercase}s);
      }
  
      public function latest(Request $request)
      {
          $column = $request->input('column', 'created_at');
          $${modelLowercase} = $this->${repositoryVariable}->latest($column);
          return response()->json($${modelLowercase});
      }
  
      public function oldest(Request $request)
      {
          $column = $request->input('column', 'created_at');
          $${modelLowercase} = $this->${repositoryVariable}->oldest($column);
          return response()->json($${modelLowercase});
      }
  
      public function findMany(Request $request)
      {
          $ids = $request->input('ids', []);
          $${modelLowercase}s = $this->${repositoryVariable}->findMany($ids);
          return response()->json($${modelLowercase}s);
      }
  
      public function whereIn(Request $request)
      {
          $column = $request->input('column');
          $values = $request->input('values', []);
          $${modelLowercase}s = $this->${repositoryVariable}->whereIn($column, $values);
          return response()->json($${modelLowercase}s);
      }
  
      public function whereNotIn(Request $request)
      {
          $column = $request->input('column');
          $values = $request->input('values', []);
          $${modelLowercase}s = $this->${repositoryVariable}->whereNotIn($column, $values);
          return response()->json($${modelLowercase}s);
      }
  
      public function whereBetween(Request $request)
      {
          $column = $request->input('column');
          $range = $request->input('range', []);
          $${modelLowercase}s = $this->${repositoryVariable}->whereBetween($column, $range);
          return response()->json($${modelLowercase}s);
      }
  
      public function withTrashed()
      {
          $${modelLowercase}s = $this->${repositoryVariable}->withTrashed();
          return response()->json($${modelLowercase}s);
      }
  
      public function onlyTrashed()
      {
          $${modelLowercase}s = $this->${repositoryVariable}->onlyTrashed();
          return response()->json($${modelLowercase}s);
      }
  
      public function withoutTrashed()
      {
          $${modelLowercase}s = $this->${repositoryVariable}->withoutTrashed();
          return response()->json($${modelLowercase}s);
      }
  
      public function orderBy(Request $request)
      {
          $column = $request->input('column');
          $direction = $request->input('direction', 'asc');
          $${modelLowercase}s = $this->${repositoryVariable}->orderBy($column, $direction);
          return response()->json($${modelLowercase}s);
      }
  
      public function groupBy(Request $request)
      {
          $column = $request->input('column');
          $${modelLowercase}s = $this->${repositoryVariable}->groupBy($column);
          return response()->json($${modelLowercase}s);
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (APP_SETTINGS.excludePivotTableFiles && isPivot) return;

    const templatePath = path.resolve(
      __dirname,
      `../templates/backend/${framework}/controller.txt`,
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
