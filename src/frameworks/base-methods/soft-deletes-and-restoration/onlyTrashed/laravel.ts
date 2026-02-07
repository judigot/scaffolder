import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'onlyTrashed',
  route: `Route::get('{{tableName.plural.kebabCase}}/only-trashed', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.only-trashed');`,
  description: 'Retrieve only soft-deleted records',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->onlyTrashed()->get();`,
  serviceMethod: `{{methodName}}(): Collection`,
  serviceContent: `
      return $this->repository->{{methodName}}();
      `,
  controllerMethod: `{{methodName}}()`,
  controllerContent: `
      $items = $this->service->{{methodName}}();
      return response()->json($items);
      `,
} satisfies IMethod;
