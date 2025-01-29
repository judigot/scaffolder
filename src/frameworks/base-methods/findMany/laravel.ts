import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'findMany',
  route: `Route::post('{{tableNameKebabCasePlural}}/find-many', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.find-many');`,
  description: 'Find multiple records by their IDs',
  repositoryMethod: `{{methodName}}(array $ids): Collection`,
  repositoryContent: `return $this->model->findMany($ids);`,
  serviceMethod: `{{methodName}}(array $ids): Collection`,
  serviceContent: `
      
      return $this->repository->{{methodName}}($ids);
      
    `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      
      $ids = $request->input('ids', []);
      $items = $this->service->{{methodName}}($ids);
      return response()->json($items);
      
    `,
} satisfies IMethod;
