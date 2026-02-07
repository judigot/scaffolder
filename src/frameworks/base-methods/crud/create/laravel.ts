import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'create',
  route: `Route::post('{{tableName.plural.kebabCase}}', [{{tableName.pascalCase}}Controller::class, 'store'])->name('{{tableName.plural.kebabCase}}.store');`,
  description: 'Create a new record',
  repositoryMethod: `{{methodName}}(array $data): Model`,
  repositoryContent: `return $this->model->{{methodName}}($data);`,
  serviceMethod: `{{methodName}}(array $data)`,
  serviceContent: `
        return $this->repository->{{methodName}}($data);
      `,
  controllerMethod: `store(Request $request)`,
  controllerContent: `
        $item = $this->service->{{methodName}}($request->all());
        return response()->json($item, 201);
      `,
} satisfies IMethod;
