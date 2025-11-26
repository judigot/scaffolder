export default {
  group: 'Soft Deletes and Restoration',
  methods: [
    {
      methodName: 'softDelete',
      route: `Route::delete('{{tableNameKebabCasePlural}}/{id}/soft-delete', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.soft-delete');`,
      description: 'Soft delete a specific record by ID',
      repositoryMethod: '{{methodName}}(int $id): bool',
      repositoryContent: `
      $record = $this->model->find($id);
      return $record ? $record->delete() : false;
      `,
      serviceMethod: '{{methodName}}(int $id): bool',
      serviceContent: `
      return $this->repository->{{methodName}}($id);
      `,
      controllerMethod: '{{methodName}}($id)',
      controllerContent: `
      $softDeleted = $this->service->{{methodName}}($id);
      return $softDeleted
            ? response()->json(['message' => 'Resource soft-deleted'])
            : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      methodName: 'restore',
      route: `Route::put('{{tableNameKebabCasePlural}}/{id}/restore', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.restore');`,
      description: 'Restore a soft-deleted record by ID',
      repositoryMethod: '{{methodName}}(int $id): bool',
      repositoryContent: `
      $record = $this->model->onlyTrashed()->find($id);
      return $record ? $record->restore() : false;
      `,
      serviceMethod: '{{methodName}}(int $id): bool',
      serviceContent: `
      return $this->repository->{{methodName}}($id);
      `,
      controllerMethod: '{{methodName}}($id)',
      controllerContent: `
      $restored = $this->service->{{methodName}}($id);
      return $restored
            ? response()->json(['message' => 'Resource restored'])
            : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      methodName: 'withTrashed',
      route: `Route::get('{{tableNameKebabCasePlural}}/with-trashed', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.with-trashed');`,
      description: 'Retrieve all records including soft-deleted ones',
      repositoryMethod: '{{methodName}}(): Collection',
      repositoryContent: 'return $this->model->withTrashed()->get();',
      serviceMethod: '{{methodName}}(): Collection',
      serviceContent: `
      return $this->repository->{{methodName}}();
      `,
      controllerMethod: '{{methodName}}()',
      controllerContent: `
      $items = $this->service->{{methodName}}();
      return response()->json($items);
      `,
    },
    {
      methodName: 'onlyTrashed',
      route: `Route::get('{{tableNameKebabCasePlural}}/only-trashed', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.only-trashed');`,
      description: 'Retrieve only soft-deleted records',
      repositoryMethod: '{{methodName}}(): Collection',
      repositoryContent: 'return $this->model->onlyTrashed()->get();',
      serviceMethod: '{{methodName}}(): Collection',
      serviceContent: `
      return $this->repository->{{methodName}}();
      `,
      controllerMethod: '{{methodName}}()',
      controllerContent: `
      $items = $this->service->{{methodName}}();
      return response()->json($items);
      `,
    },
    {
      methodName: 'withoutTrashed',
      route: `Route::get('{{tableNameKebabCasePlural}}/without-trashed', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.without-trashed');`,
      description: 'Retrieve records excluding soft-deleted ones',
      repositoryMethod: '{{methodName}}(): Collection',
      repositoryContent: 'return $this->model->withoutTrashed()->get();',
      serviceMethod: '{{methodName}}(): Collection',
      serviceContent: `
      return $this->repository->{{methodName}}();
      `,
      controllerMethod: '{{methodName}}()',
      controllerContent: `
      $items = $this->service->{{methodName}}();
      return response()->json($items);
      `,
    },
  ],
};
