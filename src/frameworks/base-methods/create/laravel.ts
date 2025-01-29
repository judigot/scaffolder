import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'create',
  route: `Route::post('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, 'store'])->name('{{tableNameKebabCasePlural}}.store');`,
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
