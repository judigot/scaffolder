export default {
  group: 'Soft Deletes and Restoration',
  methods: [
    {
      route: '',
      repositoryMethod: 'softDelete(int $id): bool',
      repositoryContent: `
      $record = $this->model->find($id);
      return $record ? $record->delete() : false;
      `,
      serviceMethod: 'softDelete(int $id): bool',
      serviceContent: `
      return $this->repository->softDelete($id);
      `,
      controllerMethod: 'softDelete($id)',
      controllerContent: `
      $softDeleted = $this->service->softDelete($id);
      return $softDeleted
            ? response()->json(['message' => 'Resource soft-deleted'])
            : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      route: '',
      repositoryMethod: 'restore(int $id): bool',
      repositoryContent: `
      $record = $this->model->onlyTrashed()->find($id);
      return $record ? $record->restore() : false;
      `,
      serviceMethod: 'restore(int $id): bool',
      serviceContent: `
      return $this->repository->restore($id);
      `,
      controllerMethod: 'restore($id)',
      controllerContent: `
      $restored = $this->service->restore($id);
      return $restored
            ? response()->json(['message' => 'Resource restored'])
            : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      route: '',
      repositoryMethod: 'withTrashed(): Collection',
      repositoryContent: 'return $this->model->withTrashed()->get();',
      serviceMethod: 'withTrashed(): Collection',
      serviceContent: `
      return $this->repository->withTrashed();
      `,
      controllerMethod: 'withTrashed()',
      controllerContent: `
      $items = $this->service->withTrashed();
      return response()->json($items);
      `,
    },
    {
      route: '',
      repositoryMethod: 'onlyTrashed(): Collection',
      repositoryContent: 'return $this->model->onlyTrashed()->get();',
      serviceMethod: 'onlyTrashed(): Collection',
      serviceContent: `
      return $this->repository->onlyTrashed();
      `,
      controllerMethod: 'onlyTrashed()',
      controllerContent: `
      $items = $this->service->onlyTrashed();
      return response()->json($items);
      `,
    },
    {
      route: '',
      repositoryMethod: 'withoutTrashed(): Collection',
      repositoryContent: 'return $this->model->withoutTrashed()->get();',
      serviceMethod: 'withoutTrashed(): Collection',
      serviceContent: `
      return $this->repository->withoutTrashed();
      `,
      controllerMethod: 'withoutTrashed()',
      controllerContent: `
      $items = $this->service->withoutTrashed();
      return response()->json($items);
      `,
    },
  ],
};
