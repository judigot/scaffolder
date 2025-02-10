import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'whereIn',
  route: `Route::post('{{tableNameKebabCasePlural}}/where-in', [{{tableNamePascalCase}}Controller::class, 'whereIn'])->name('{{tableNameKebabCasePlural}}.where-in');`,
  description: 'Filter records based on a set of values',
  repositoryMethod: `whereIn(string $column, array $values): Collection`,
  repositoryContent: `return $this->model->whereIn($column, $values)->get();`,
  serviceMethod: `whereIn(string $column, array $values): Collection`,
  serviceContent: `
        return $this->repository->whereIn($column, $values);
      `,
  controllerMethod: `whereIn(Request $request)`,
  controllerContent: `
        $column = $request->input('column');
        $values = $request->input('values', []);
        $items = $this->service->whereIn($column, $values);
        return response()->json($items);
      `,
} satisfies IMethod;
