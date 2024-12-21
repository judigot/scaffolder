import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure';

export default {
  group: 'Soft Deletes and Restoration',
  methods: [
    {
      methodName: 'softDelete',
      route: `Route::delete('{{tableNameKebabCasePlural}}/{id}/soft-delete', [{{tableNamePascalCase}}Controller::class, 'softDelete'])->name('{{tableNameKebabCasePlural}}.soft-delete');`,
      description: 'Soft delete a specific record by ID',
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
      methodName: 'restore',
      route: `Route::put('{{tableNameKebabCasePlural}}/{id}/restore', [{{tableNamePascalCase}}Controller::class, 'restore'])->name('{{tableNameKebabCasePlural}}.restore');`,
      description: 'Restore a soft-deleted record by ID',
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
      methodName: 'withTrashed',
      route: `Route::get('{{tableNameKebabCasePlural}}/with-trashed', [{{tableNamePascalCase}}Controller::class, 'withTrashed'])->name('{{tableNameKebabCasePlural}}.with-trashed');`,
      description: 'Retrieve all records including soft-deleted ones',
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
      methodName: 'onlyTrashed',
      route: `Route::get('{{tableNameKebabCasePlural}}/only-trashed', [{{tableNamePascalCase}}Controller::class, 'onlyTrashed'])->name('{{tableNameKebabCasePlural}}.only-trashed');`,
      description: 'Retrieve only soft-deleted records',
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
      methodName: 'withoutTrashed',
      route: `Route::get('{{tableNameKebabCasePlural}}/without-trashed', [{{tableNamePascalCase}}Controller::class, 'withoutTrashed'])->name('{{tableNameKebabCasePlural}}.without-trashed');`,
      description: 'Retrieve records excluding soft-deleted ones',
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
} satisfies IRepositoryStructure;
