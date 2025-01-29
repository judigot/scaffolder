import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'firstOrCreate',
  route: `Route::post('{{tableNameKebabCasePlural}}/first-or-create', [{{tableNamePascalCase}}Controller::class, 'firstOrCreate'])->name('{{tableNameKebabCasePlural}}.first-or-create');`,
  description: 'Find or create a record',
  repositoryMethod: `firstOrCreate(array $attributes, array $values = []): Model`,
  repositoryContent: `return $this->model->firstOrCreate($attributes, $values);`,
  serviceMethod: `firstOrCreate(array $attributes, array $values = []): Model`,
  serviceContent: `
      
        return $this->repository->firstOrCreate($attributes, $values);
      
    `,
  controllerMethod: `firstOrCreate(Request $request)`,
  controllerContent: `
      
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->service->firstOrCreate($attributes, $values);
        return response()->json($item);
      
    `,
} satisfies IMethod;
