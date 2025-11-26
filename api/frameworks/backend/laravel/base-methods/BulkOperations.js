export default {
  group: 'Bulk Operations',
  methods: [
    {
      methodName: 'batchUpdate',
      route: `Route::post('{{tableNameKebabCasePlural}}/batch-update', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.batch-update');`,
      description: 'Batch update multiple records',
      repositoryMethod: '{{methodName}}(array $criteria, array $data): bool',
      repositoryContent: `
      return $this->model->where($criteria)->update($data) > 0;
      `,
      serviceMethod: '{{methodName}}(array $criteria, array $data): bool',
      serviceContent: `
      return $this->repository->{{methodName}}($criteria, $data);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $criteria = $request->input('criteria', []);
      $data = $request->input('data', []);
      $updated = $this->service->{{methodName}}($criteria, $data);
      return response()->json(['updated' => $updated]);
      `,
    },
    {
      methodName: 'updateOrCreate',
      route: `Route::post('{{tableNameKebabCasePlural}}/update-or-create', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.update-or-create');`,
      description: 'Create or update a record',
      repositoryMethod:
        '{{methodName}}(array $attributes, array $values = []): Model',
      repositoryContent: `
      return $this->model->updateOrCreate($attributes, $values);
      `,
      serviceMethod:
        '{{methodName}}(array $attributes, array $values = []): Model',
      serviceContent: `
      return $this->repository->{{methodName}}($attributes, $values);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $attributes = $request->input('attributes', []);
      $values = $request->input('values', []);
      $item = $this->service->{{methodName}}($attributes, $values);
      return response()->json($item);
      `,
    },
  ],
};
