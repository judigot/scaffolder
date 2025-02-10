import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'getWithRelations',
  route: `Route::get('{{tableNameKebabCasePlural}}/with-relations', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.with-relations');`,
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
