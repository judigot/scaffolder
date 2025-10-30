import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'groupBy',
  route: `Route::get('{{tableNameKebabCasePlural}}/group-by', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.group-by');`,
  description: 'Group records by a specific column',
  repositoryMethod: `{{methodName}}(string $column): Collection`,
  repositoryContent: `return $this->model->groupBy($column)->get();`,
  serviceMethod: `{{methodName}}(string $column): Collection`,
  serviceContent: `
      return $this->repository->{{methodName}}($column);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $column = $request->input('column');
      $items = $this->service->{{methodName}}($column);
      return response()->json($items);
      `,
} satisfies IMethod;
