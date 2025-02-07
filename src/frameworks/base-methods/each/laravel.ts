import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'each',
  route: `Route::post('{{tableNameKebabCasePlural}}/each', [{{tableNamePascalCase}}Controller::class, 'each'])->name('{{tableNameKebabCasePlural}}.each');`,
  description: 'Process each record individually',
  repositoryMethod: `each(callable $callback): bool`,
  repositoryContent: `return $this->model->each($callback);`,
  serviceMethod: `each(callable $callback): bool`,
  serviceContent: `
        return $this->repository->each($callback);
      `,
  controllerMethod: `each()`,
  controllerContent: `
        $callback = function ($item) {
            return response()->json($item);
        };
        $this->service->each($callback);
      `,
} satisfies IMethod;
