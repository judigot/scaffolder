import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'findByAttributes',
  route: `Route::get('{{tableName.plural.kebabCase}}/find-by-attributes', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.find-by-attributes');`,
  description: 'Find a record by specific attributes',
  repositoryMethod: `{{methodName}}(array $attributes): ?Model`,
  repositoryContent: `return $this->model->where($attributes)->first();`,
  serviceMethod: `{{methodName}}(array $attributes): ?Model`,
  serviceContent: `
      return $this->repository->{{methodName}}($attributes);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $attributes = $request->all();
      $item = $this->service->{{methodName}}($attributes);
      return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
} satisfies IMethod;
