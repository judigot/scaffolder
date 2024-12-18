export default {
  group: 'CRUD Operations',
  methods: [
    {
      route: `// Get all records
        Route::get('{{snakeCasePlural}}', [{{className}}Controller::class, 'index']);`,
      repositoryMethod: 'getAll(): Collection',
      repositoryContent: 'return $this->model->all();',
      serviceMethod: 'getAll()',
      serviceContent: `
        return $this->repository->getAll();
      `,
      controllerMethod: 'index()',
      controllerContent: `
        $items = $this->service->getAll();
        return response()->json($items);
      `,
    },
    {
      route: `// Find a specific record by ID
        Route::get('{{snakeCasePlural}}/{id}', [{{className}}Controller::class, 'show']);`,
      repositoryMethod: 'findById(int $id): ?Model',
      repositoryContent: 'return $this->model->find($id);',
      serviceMethod: 'findById($id)',
      serviceContent: `
        return $this->repository->findById($id);
      `,
      controllerMethod: 'show($id)',
      controllerContent: `
        $item = $this->service->findById($id);
        return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      route: `// Create a new record
        Route::post('{{snakeCasePlural}}', [{{className}}Controller::class, 'store']);`,
      repositoryMethod: 'create(array $data): Model',
      repositoryContent: 'return $this->model->create($data);',
      serviceMethod: 'create(array $data)',
      serviceContent: `
        return $this->repository->create($data);
      `,
      controllerMethod: 'store(Request $request)',
      controllerContent: `
        $item = $this->service->create($request->all());
        return response()->json($item, 201);
      `,
    },
    {
      route: `// Update a specific record by ID
        Route::put('{{snakeCasePlural}}/{id}', [{{className}}Controller::class, 'update']);`,
      repositoryMethod: 'update(int $id, array $data): bool',
      repositoryContent: `
        $record = $this->model->find($id);
        return $record ? $record->update($data) : false;
      `,
      serviceMethod: 'update($id, array $data)',
      serviceContent: `
        return $this->repository->update($id, $data);
      `,
      controllerMethod: 'update(Request $request, $id)',
      controllerContent: `
        $updated = $this->service->update($id, $request->all());
        return $updated ? response()->json(['message' => 'Resource updated']) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      route: `// Delete a specific record by ID
        Route::delete('{{snakeCasePlural}}/{id}', [{{className}}Controller::class, 'destroy']);`,
      repositoryMethod: 'delete(int $id): bool',
      repositoryContent: `
        $record = $this->model->find($id);
        return $record ? $record->delete() : false;
      `,
      serviceMethod: 'delete($id)',
      serviceContent: `
        return $this->repository->delete($id);
      `,
      controllerMethod: 'destroy($id)',
      controllerContent: `
        $deleted = $this->service->delete($id);
        return $deleted ? response()->json(['message' => 'Resource deleted']) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
  ],
};
