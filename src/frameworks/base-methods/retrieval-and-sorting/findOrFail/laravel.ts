import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'findOrFail',
  route: `Route::get('{{tableName.plural.kebabCase}}/{id}/find-or-fail', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.find-or-fail');`,
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
