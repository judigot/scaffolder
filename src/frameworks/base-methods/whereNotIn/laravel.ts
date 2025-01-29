import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'whereNotIn',
  route: `Route::post('{{tableNameKebabCasePlural}}/where-not-in', [{{tableNamePascalCase}}Controller::class, 'whereNotIn'])->name('{{tableNameKebabCasePlural}}.where-not-in');`,
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
