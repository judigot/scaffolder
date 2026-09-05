import type { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Bulk Operations',
  methods: [
    {
      methodName: 'batchUpdate',
      route: `Route::post('{{tableName.plural.kebabCase}}/batch-update', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.batch-update');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/update-or-create', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.update-or-create');`,
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
} satisfies IRepositoryStructure;
