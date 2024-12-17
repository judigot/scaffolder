export default {
  group: 'Soft Deletes and Restoration',
  methods: [
    {
      repositoryMethod: 'softDelete(int $id): bool',
      repositoryContent: `
      $record = $this->model->find($id);
      return $record ? $record->delete() : false;
      `,
      controllerMethod: 'softDelete($id)',
      controllerContent: `
      $softDeleted = $this->repository->softDelete($id);
      return $softDeleted
          ? response()->json(['message' => 'Resource soft-deleted'])
          : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      repositoryMethod: 'restore(int $id): bool',
      repositoryContent: `
      $record = $this->model->onlyTrashed()->find($id);
      return $record ? $record->restore() : false;
      `,
      controllerMethod: 'restore($id)',
      controllerContent: `
      $restored = $this->repository->restore($id);
      return $restored
          ? response()->json(['message' => 'Resource restored'])
          : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      repositoryMethod: 'withTrashed(): Collection',
      repositoryContent: 'return $this->model->withTrashed()->get();',
      controllerMethod: 'withTrashed()',
      controllerContent: `
      $items = $this->repository->withTrashed();
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'onlyTrashed(): Collection',
      repositoryContent: 'return $this->model->onlyTrashed()->get();',
      controllerMethod: 'onlyTrashed()',
      controllerContent: `
      $items = $this->repository->onlyTrashed();
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'withoutTrashed(): Collection',
      repositoryContent: 'return $this->model->withoutTrashed()->get();',
      controllerMethod: 'withoutTrashed()',
      controllerContent: `
      $items = $this->repository->withoutTrashed();
      return response()->json($items);
      `,
    },
  ],
};
