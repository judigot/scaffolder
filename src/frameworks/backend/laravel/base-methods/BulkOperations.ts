export default {
  group: 'Bulk Operations',
  methods: [
    {
      repositoryMethod: 'batchUpdate(array $criteria, array $data): bool',
      repositoryContent: `
      return $this->model->where($criteria)->update($data) > 0;
      `,
      serviceMethod: 'batchUpdate(array $criteria, array $data): bool',
      serviceContent: `
      return $this->repository->batchUpdate($criteria, $data);
      `,
      controllerMethod: 'batchUpdate(Request $request)',
      controllerContent: `
      $criteria = $request->input('criteria', []);
      $data = $request->input('data', []);
      $updated = $this->service->batchUpdate($criteria, $data);
      return response()->json(['updated' => $updated]);
      `,
    },
    {
      repositoryMethod:
        'updateOrCreate(array $attributes, array $values = []): Model',
      repositoryContent: `
      return $this->model->updateOrCreate($attributes, $values);
      `,
      serviceMethod:
        'updateOrCreate(array $attributes, array $values = []): Model',
      serviceContent: `
      return $this->repository->updateOrCreate($attributes, $values);
      `,
      controllerMethod: 'updateOrCreate(Request $request)',
      controllerContent: `
      $attributes = $request->input('attributes', []);
      $values = $request->input('values', []);
      $item = $this->service->updateOrCreate($attributes, $values);
      return response()->json($item);
      `,
    },
  ],
};
