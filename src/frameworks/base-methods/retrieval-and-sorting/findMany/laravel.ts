import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'findMany',
  route: `Route::post('{{tableName.plural.kebabCase}}/find-many', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.find-many');`,
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
