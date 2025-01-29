import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'findOrFail',
  route: `Route::get('{{tableNameKebabCasePlural}}/{id}/find-or-fail', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.find-or-fail');`,
  description: 'Find a record or throw an exception if not found',
  repositoryMethod: `{{methodName}}(int $id): Model`,
  repositoryContent: `return $this->model->findOrFail($id);`,
  serviceMethod: `{{methodName}}(int $id): Model`,
  serviceContent: `
      
      return $this->repository->{{methodName}}($id);
      
    `,
  controllerMethod: `{{methodName}}($id)`,
  controllerContent: `
      
      $item = $this->service->{{methodName}}($id);
      return response()->json($item);
      
    `,
} satisfies IMethod;
