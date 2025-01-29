import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'pluck',
  route: `Route::get('{{tableNameKebabCasePlural}}/pluck', [{{tableNamePascalCase}}Controller::class, 'pluck'])->name('{{tableNameKebabCasePlural}}.pluck');`,
  description: 'Retrieve a list of specific column values',
  repositoryMethod: `pluck(string $column, string $key = null): Collection`,
  repositoryContent: `return $this->model->pluck($column, $key);`,
  serviceMethod: `pluck(string $column, string $key = null): Collection`,
  serviceContent: `
      
        return $this->repository->pluck($column, $key);
      
    `,
  controllerMethod: `pluck(Request $request)`,
  controllerContent: `
      
        $column = $request->input('column');
        $key = $request->input('key', null);
        $values = $this->service->pluck($column, $key);
        return response()->json($values);
      
    `,
} satisfies IMethod;
