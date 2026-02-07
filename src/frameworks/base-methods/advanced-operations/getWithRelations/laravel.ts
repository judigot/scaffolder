import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'getWithRelations',
  route: `Route::get('{{tableName.plural.kebabCase}}/with-relations', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.with-relations');`,
  description: 'Retrieve related models',
  repositoryMethod: `{{methodName}}(array $relations): Collection`,
  repositoryContent: `return $this->model->with($relations)->get();`,
  serviceMethod: `{{methodName}}(array $relations): Collection`,
  serviceContent: `
        return $this->repository->{{methodName}}($relations);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
        $relations = $request->input('relations', []);
        $items = $this->service->{{methodName}}($relations);
        return response()->json($items);
      `,
} satisfies IMethod;
