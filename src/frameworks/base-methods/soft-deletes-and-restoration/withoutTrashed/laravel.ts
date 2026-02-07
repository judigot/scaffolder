import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'withoutTrashed',
  route: `Route::get('{{tableName.plural.kebabCase}}/without-trashed', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.without-trashed');`,
  description: 'Retrieve records excluding soft-deleted ones',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->withoutTrashed()->get();`,
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
