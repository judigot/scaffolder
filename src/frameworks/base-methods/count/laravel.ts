import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'count',
  route: `Route::get('{{tableNameKebabCasePlural}}/count', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.count');`,
  description: 'Count records by criteria',
  repositoryMethod: `{{methodName}}(array $criteria = []): int`,
  repositoryContent: `return $this->model->where($criteria)->count();`,
  serviceMethod: `{{methodName}}(array $criteria = []): int`,
  serviceContent: `
      
        return $this->repository->{{methodName}}($criteria);
      
    `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      
        $criteria = $request->all();
        $count = $this->service->{{methodName}}($criteria);
        return response()->json(['count' => $count]);
      
    `,
} satisfies IMethod;
