import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'whereBetween',
  route: `Route::post('{{tableName.plural.kebabCase}}/where-between', [{{tableName.pascalCase}}Controller::class, 'whereBetween'])->name('{{tableName.plural.kebabCase}}.where-between');`,
  description: 'Filter records between two values',
  repositoryMethod: `whereBetween(string $column, array $range): Collection`,
  repositoryContent: `return $this->model->whereBetween($column, $range)->get();`,
  serviceMethod: `whereBetween(string $column, array $range): Collection`,
  serviceContent: `
        return $this->repository->whereBetween($column, $range);
      `,
  controllerMethod: `whereBetween(Request $request)`,
  controllerContent: `
        $column = $request->input('column');
        $range = $request->input('range', []);
        $items = $this->service->whereBetween($column, $range);
        return response()->json($items);
      `,
} satisfies IMethod;
