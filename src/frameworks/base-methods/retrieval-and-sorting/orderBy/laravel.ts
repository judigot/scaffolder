import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'orderBy',
  route: `Route::get('{{tableName.plural.kebabCase}}/order-by', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.order-by');`,
  description: 'Order records by a specific column and direction',
  repositoryMethod: `{{methodName}}(string $column, string $direction = 'asc'): Collection`,
  repositoryContent: `return $this->model->orderBy($column, $direction)->get();`,
  serviceMethod: `{{methodName}}(string $column, string $direction = 'asc'): Collection`,
  serviceContent: `
      return $this->repository->{{methodName}}($column, $direction);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $column = $request->input('column');
      $direction = $request->input('direction', 'asc');
      $items = $this->service->{{methodName}}($column, $direction);
      return response()->json($items);
      `,
} satisfies IMethod;
