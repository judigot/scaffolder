import type { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Query and Search',
  methods: [
    {
      methodName: 'findByAttributes',
      route: `Route::get('{{tableName.plural.kebabCase}}/find-by-attributes', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.find-by-attributes');`,
      description: 'Find a record by specific attributes',
      repositoryMethod: '{{methodName}}(array $attributes): ?Model',
      repositoryContent: 'return $this->model->where($attributes)->first();',
      serviceMethod: '{{methodName}}(array $attributes): ?Model',
      serviceContent: `
      return $this->repository->{{methodName}}($attributes);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $attributes = $request->all();
      $item = $this->service->{{methodName}}($attributes);
      return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      methodName: 'paginate',
      route: `Route::get('{{tableName.plural.kebabCase}}/paginate', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.paginate');`,
      description: 'Paginate records',
      repositoryMethod: '{{methodName}}(int $perPage = 15)',
      repositoryContent: 'return $this->model->paginate($perPage);',
      serviceMethod: '{{methodName}}(int $perPage = 15)',
      serviceContent: `
        return $this->repository->{{methodName}}($perPage);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
        $perPage = $request->input('per_page', 15);
        $items = $this->service->{{methodName}}($perPage);
        return response()->json($items);
      `,
    },
    {
      methodName: 'search',
      route: `Route::get('{{tableName.plural.kebabCase}}/search', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.search');`,
      description: 'Search records',
      repositoryMethod:
        '{{methodName}}(string $query, array $fields, int $perPage = 15)',
      repositoryContent: `
        return $this->model->where(function ($q) use ($query, $fields) {
            foreach ($fields as $field) {
                $q->orWhere($field, 'LIKE', "%$query%");
            }
        })->paginate($perPage);
      `,
      serviceMethod:
        '{{methodName}}(string $query, array $fields, int $perPage = 15)',
      serviceContent: `
        return $this->repository->{{methodName}}($query, $fields, $perPage);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
        $query = $request->input('query');
        $fields = $request->input('fields', []);
        $perPage = $request->input('per_page', 15);
        $results = $this->service->{{methodName}}($query, $fields, $perPage);
        return response()->json($results);
      `,
    },
    {
      methodName: 'count',
      route: `Route::get('{{tableName.plural.kebabCase}}/count', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.count');`,
      description: 'Count records by criteria',
      repositoryMethod: '{{methodName}}(array $criteria = []): int',
      repositoryContent: 'return $this->model->where($criteria)->count();',
      serviceMethod: '{{methodName}}(array $criteria = []): int',
      serviceContent: `
        return $this->repository->{{methodName}}($criteria);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
        $criteria = $request->all();
        $count = $this->service->{{methodName}}($criteria);
        return response()->json(['count' => $count]);
      `,
    },
    {
      methodName: 'exists',
      route: `Route::get('{{tableName.plural.kebabCase}}/exists', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.exists');`,
      description: 'Check if a record exists',
      repositoryMethod: '{{methodName}}(array $criteria): bool',
      repositoryContent: 'return $this->model->where($criteria)->exists();',
      serviceMethod: '{{methodName}}(array $criteria): bool',
      serviceContent: `
        return $this->repository->{{methodName}}($criteria);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
        $criteria = $request->all();
        $exists = $this->service->{{methodName}}($criteria);
        return response()->json(['exists' => $exists]);
      `,
    },
  ],
} satisfies IRepositoryStructure;
