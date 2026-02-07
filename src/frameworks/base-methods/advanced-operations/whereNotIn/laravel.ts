import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'whereNotIn',
  route: `Route::post('{{tableName.plural.kebabCase}}/where-not-in', [{{tableName.pascalCase}}Controller::class, 'whereNotIn'])->name('{{tableName.plural.kebabCase}}.where-not-in');`,
  description: 'Filter records excluding a set of values',
  repositoryMethod: `whereNotIn(string $column, array $values): Collection`,
  repositoryContent: `return $this->model->whereNotIn($column, $values)->get();`,
  serviceMethod: `whereNotIn(string $column, array $values): Collection`,
  serviceContent: `
        return $this->repository->whereNotIn($column, $values);
      `,
  controllerMethod: `whereNotIn(Request $request)`,
  controllerContent: `
        $column = $request->input('column');
        $values = $request->input('values', []);
        $items = $this->service->whereNotIn($column, $values);
        return response()->json($items);
      `,
} satisfies IMethod;
