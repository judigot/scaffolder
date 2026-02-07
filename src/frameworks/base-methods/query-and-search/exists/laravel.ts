import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'exists',
  route: `Route::get('{{tableName.plural.kebabCase}}/exists', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.exists');`,
  description: 'Check if a record exists',
  repositoryMethod: `{{methodName}}(array $criteria): bool`,
  repositoryContent: `return $this->model->where($criteria)->exists();`,
  serviceMethod: `{{methodName}}(array $criteria): bool`,
  serviceContent: `
        return $this->repository->{{methodName}}($criteria);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
        $criteria = $request->all();
        $exists = $this->service->{{methodName}}($criteria);
        return response()->json(['exists' => $exists]);
      `,
} satisfies IMethod;
