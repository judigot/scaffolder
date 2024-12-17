export default {
  group: 'CRUD Operations',
  methods: [
    {
      repositoryMethod: 'getAll(): Collection',
      repositoryContent: 'return $this->model->all();',
      controllerMethod: 'index()',
      controllerContent: `
        $items = $this->repository->getAll();
        return response()->json($items);
        `,
    },
    {
      repositoryMethod: 'findById(int $id): ?Model',
      repositoryContent: 'return $this->model->find($id);',
      controllerMethod: 'show($id)',
      controllerContent: `
        $item = $this->repository->findById($id);
        return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
        `,
    },
    {
      repositoryMethod: 'create(array $data): Model',
      repositoryContent: 'return $this->model->create($data);',
      controllerMethod: 'store(Request $request)',
      controllerContent: `
        $item = $this->repository->create($request->all());
        return response()->json($item, 201);
        `,
    },
    {
      repositoryMethod: 'update(int $id, array $data): bool',
      repositoryContent: `
      $record = $this->model->find($id);
      return $record ? $record->update($data) : false;
      `,
      controllerMethod: 'update(Request $request, $id)',
      controllerContent: `
        $updated = $this->repository->update($id, $request->all());
        return $updated ? response()->json(['message' => 'Resource updated']) : response()->json(['message' => 'Resource not found'], 404);
        `,
    },
    {
      repositoryMethod: 'delete(int $id): bool',
      repositoryContent: `
      $record = $this->model->find($id);
      return $record ? $record->delete() : false;
      `,
      controllerMethod: 'destroy($id)',
      controllerContent: `
        $deleted = $this->repository->delete($id);
        return $deleted ? response()->json(['message' => 'Resource deleted']) : response()->json(['message' => 'Resource not found'], 404);
        `,
    },
  ],
};
