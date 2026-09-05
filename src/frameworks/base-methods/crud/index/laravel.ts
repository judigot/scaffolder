import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'index',
  route: `Route::get('{{tableName.plural.kebabCase}}', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.{{methodName}}');`,
  description: 'Get all records',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->all();`,
  serviceMethod: `{{methodName}}()`,
  serviceContent: `
        return $this->repository->{{methodName}}();
      `,
  controllerMethod: `{{methodName}}()`,
  controllerContent: `
        $items = $this->service->{{methodName}}();
        return response()->json($items);
      `,
} satisfies IMethod;
