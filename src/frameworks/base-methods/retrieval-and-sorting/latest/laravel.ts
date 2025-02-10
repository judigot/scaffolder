import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'latest',
  route: `Route::get('{{tableNameKebabCasePlural}}/latest', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.latest');`,
  description: 'Retrieve the latest record based on a column',
  repositoryMethod: `{{methodName}}(string $column = 'created_at'): ?Model`,
  repositoryContent: `return $this->model->latest($column)->first();`,
  serviceMethod: `{{methodName}}(string $column = 'created_at'): ?Model`,
  serviceContent: `
      return $this->repository->{{methodName}}($column);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->service->{{methodName}}($column);
      return response()->json($item);
      `,
} satisfies IMethod;
