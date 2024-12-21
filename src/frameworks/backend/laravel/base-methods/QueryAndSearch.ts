import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Query and Search',
  methods: [
    {
      methodName: 'findByAttributes',
      route: `Route::get('{{tableNameKebabCasePlural}}/find-by-attributes', [{{tableNamePascalCase}}Controller::class, 'findByAttributes'])->name('{{tableNameKebabCasePlural}}.find-by-attributes');`,
      description: 'Find a record by specific attributes',
      repositoryMethod: 'findByAttributes(array $attributes): ?Model',
      repositoryContent: 'return $this->model->where($attributes)->first();',
      serviceMethod: 'findByAttributes(array $attributes): ?Model',
      serviceContent: `
      return $this->repository->findByAttributes($attributes);
      `,
      controllerMethod: 'findByAttributes(Request $request)',
      controllerContent: `
      $attributes = $request->all();
      $item = $this->service->findByAttributes($attributes);
      return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      methodName: 'paginate',
      route: `Route::get('{{tableNameKebabCasePlural}}/paginate', [{{tableNamePascalCase}}Controller::class, 'paginate'])->name('{{tableNameKebabCasePlural}}.paginate');`,
      description: 'Paginate records',
      repositoryMethod: 'paginate(int $perPage = 15)',
      repositoryContent: 'return $this->model->paginate($perPage);',
      serviceMethod: 'paginate(int $perPage = 15)',
      serviceContent: `
      return $this->repository->paginate($perPage);
      `,
      controllerMethod: 'paginate(Request $request)',
      controllerContent: `
      $perPage = $request->input('per_page', 15);
      $items = $this->service->paginate($perPage);
      return response()->json($items);
      `,
    },
    {
      methodName: 'search',
      route: `Route::get('{{tableNameKebabCasePlural}}/search', [{{tableNamePascalCase}}Controller::class, 'search'])->name('{{tableNameKebabCasePlural}}.search');`,
      description: 'Search records',
      repositoryMethod:
        'search(string $query, array $fields, int $perPage = 15)',
      repositoryContent: `
      return $this->model->where(function ($q) use ($query, $fields) {
          foreach ($fields as $field) {
              $q->orWhere($field, 'LIKE', "%$query%");
          }
      })->paginate($perPage);
      `,
      serviceMethod: 'search(string $query, array $fields, int $perPage = 15)',
      serviceContent: `
      return $this->repository->search($query, $fields, $perPage);
      `,
      controllerMethod: 'search(Request $request)',
      controllerContent: `
      $query = $request->input('query');
      $fields = $request->input('fields', []);
      $perPage = $request->input('per_page', 15);
      $results = $this->service->search($query, $fields, $perPage);
      return response()->json($results);
      `,
    },
    {
      methodName: 'count',
      route: `Route::get('{{tableNameKebabCasePlural}}/count', [{{tableNamePascalCase}}Controller::class, 'count'])->name('{{tableNameKebabCasePlural}}.count');`,
      description: 'Count records by criteria',
      repositoryMethod: 'count(array $criteria = []): int',
      repositoryContent: 'return $this->model->where($criteria)->count();',
      serviceMethod: 'count(array $criteria = []): int',
      serviceContent: `
      return $this->repository->count($criteria);
      `,
      controllerMethod: 'count(Request $request)',
      controllerContent: `
      $criteria = $request->all();
      $count = $this->service->count($criteria);
      return response()->json(['count' => $count]);
      `,
    },
    {
      methodName: 'exists',
      route: `Route::get('{{tableNameKebabCasePlural}}/exists', [{{tableNamePascalCase}}Controller::class, 'exists'])->name('{{tableNameKebabCasePlural}}.exists');`,
      description: 'Check if a record exists',
      repositoryMethod: 'exists(array $criteria): bool',
      repositoryContent: 'return $this->model->where($criteria)->exists();',
      serviceMethod: 'exists(array $criteria): bool',
      serviceContent: `
      return $this->repository->exists($criteria);
      `,
      controllerMethod: 'exists(Request $request)',
      controllerContent: `
      $criteria = $request->all();
      $exists = $this->service->exists($criteria);
      return response()->json(['exists' => $exists]);
      `,
    },
  ],
} satisfies IRepositoryStructure;
