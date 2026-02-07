import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'withTrashed',
  route: `Route::get('{{tableName.plural.kebabCase}}/with-trashed', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.with-trashed');`,
  description: 'Retrieve all records including soft-deleted ones',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->withTrashed()->get();`,
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
