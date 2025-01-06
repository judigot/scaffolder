import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

const structure: IRepositoryStructure = {
  group: 'CRUD',
  methods: [
    {
      methodName: 'getAll',
      route: `Route::get('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, 'index'])->name('{{tableNameKebabCasePlural}}.index');`,
      description: 'Get all records',
      repositoryMethod: '{{methodName}}(): Collection',
      repositoryContent: 'return $this->model->all();',
      serviceMethod: '{{methodName}}()',
      serviceContent: `
        return $this->repository->{{methodName}}();
      `,
      controllerMethod: 'index()',
      controllerContent: `
        $items = $this->service->{{methodName}}();
        return response()->json($items);
      `,
    },
    {
      methodName: 'findById',
      route: `Route::get('{{tableNameKebabCasePlural}}/{id}', [{{tableNamePascalCase}}Controller::class, 'show'])->name('{{tableNameKebabCasePlural}}.show');`,
      description: 'Find a specific record by ID',
      repositoryMethod: '{{methodName}}(int $id): ?Model',
      repositoryContent: 'return $this->model->find($id);',
      serviceMethod: '{{methodName}}($id)',
      serviceContent: `
        return $this->repository->{{methodName}}($id);
      `,
      controllerMethod: 'show($id)',
      controllerContent: `
        $item = $this->service->{{methodName}}($id);
        return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      methodName: 'create',
      route: `Route::post('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, 'store'])->name('{{tableNameKebabCasePlural}}.store');`,
      description: 'Create a new record',
      repositoryMethod: '{{methodName}}(array $data): Model',
      repositoryContent: 'return $this->model->create($data);',
      serviceMethod: '{{methodName}}(array $data)',
      serviceContent: `
        return $this->repository->{{methodName}}($data);
      `,
      controllerMethod: 'store(Request $request)',
      controllerContent: `
        $item = $this->service->{{methodName}}($request->all());
        return response()->json($item, 201);
      `,
    },
    {
      methodName: 'update',
      route: `Route::put('{{tableNameKebabCasePlural}}/{id}', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.update');`,
      description: 'Update a specific record by ID',
      repositoryMethod: '{{methodName}}(int $id, array $data): bool',
      repositoryContent: `
        $record = $this->model->find($id);
        return $record ? $record->update($data) : false;
      `,
      serviceMethod: '{{methodName}}($id, array $data)',
      serviceContent: `
        return $this->repository->{{methodName}}($id, $data);
      `,
      controllerMethod: '{{methodName}}(Request $request, $id)',
      controllerContent: `
        $updated = $this->service->{{methodName}}($id, $request->all());
        return $updated ? response()->json(['message' => 'Resource updated']) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      methodName: 'delete',
      route: `Route::delete('{{tableNameKebabCasePlural}}/{id}', [{{tableNamePascalCase}}Controller::class, 'destroy'])->name('{{tableNameKebabCasePlural}}.destroy');`,
      description: 'Delete a specific record by ID',
      repositoryMethod: '{{methodName}}(int $id): bool',
      repositoryContent: `
        $record = $this->model->find($id);
        return $record ? $record->delete() : false;
      `,
      serviceMethod: '{{methodName}}($id)',
      serviceContent: `
        return $this->repository->{{methodName}}($id);
      `,
      controllerMethod: 'destroy($id)',
      controllerContent: `
        $deleted = $this->service->{{methodName}}($id);
        return $deleted ? response()->json(['message' => 'Resource deleted']) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
  ],
} satisfies IRepositoryStructure;

export default structure;
