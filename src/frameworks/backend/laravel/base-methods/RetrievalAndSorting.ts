export default {
  group: 'Retrieval and Sorting',
  methods: [
    // Commented sice Route::apiResource already handles findOrFail
    // {
    //   route: `// Find a record or throw an exception if not found
    //     Route::get('{{tableNameKebabCasePlural}}/{id}', [{{tableNamePascalCase}}Controller::class, 'findOrFail'])->name('{{tableNameKebabCasePlural}}.find-or-fail');`,
    //   repositoryMethod: 'findOrFail(int $id): Model',
    //   repositoryContent: 'return $this->model->findOrFail($id);',
    //   serviceMethod: 'findOrFail(int $id): Model',
    //   serviceContent: `
    //   return $this->repository->findOrFail($id);
    //   `,
    //   controllerMethod: 'findOrFail($id)',
    //   controllerContent: `
    //   $item = $this->service->findOrFail($id);
    //   return response()->json($item);
    //   `,
    // },
    {
      route: `// Find multiple records by their IDs
        Route::post('{{tableNameKebabCasePlural}}/find-many', [{{tableNamePascalCase}}Controller::class, 'findMany'])->name('{{tableNameKebabCasePlural}}.find-many');`,
      repositoryMethod: 'findMany(array $ids): Collection',
      repositoryContent: 'return $this->model->findMany($ids);',
      serviceMethod: 'findMany(array $ids): Collection',
      serviceContent: `
      return $this->repository->findMany($ids);
      `,
      controllerMethod: 'findMany(Request $request)',
      controllerContent: `
      $ids = $request->input('ids', []);
      $items = $this->service->findMany($ids);
      return response()->json($items);
      `,
    },
    {
      route: `// Retrieve random records
        Route::get('{{tableNameKebabCasePlural}}/random', [{{tableNamePascalCase}}Controller::class, 'random'])->name('{{tableNameKebabCasePlural}}.random');`,
      repositoryMethod: 'random(int $count = 1): Collection',
      repositoryContent: 'return $this->model->inRandomOrder()->limit($count)->get();',
      serviceMethod: 'random(int $count = 1): Collection',
      serviceContent: `
      return $this->repository->random($count);
      `,
      controllerMethod: 'random(Request $request)',
      controllerContent: `
      $count = $request->input('count', 1);
      $items = $this->service->random($count);
      return response()->json($items);
      `,
    },
    {
      route: `// Retrieve the latest record based on a column
        Route::get('{{tableNameKebabCasePlural}}/latest', [{{tableNamePascalCase}}Controller::class, 'latest'])->name('{{tableNameKebabCasePlural}}.latest');`,
      repositoryMethod: "latest(string $column = 'created_at'): ?Model",
      repositoryContent: 'return $this->model->latest($column)->first();',
      serviceMethod: "latest(string $column = 'created_at'): ?Model",
      serviceContent: `
      return $this->repository->latest($column);
      `,
      controllerMethod: 'latest(Request $request)',
      controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->service->latest($column);
      return response()->json($item);
      `,
    },
    {
      route: `// Retrieve the oldest record based on a column
        Route::get('{{tableNameKebabCasePlural}}/oldest', [{{tableNamePascalCase}}Controller::class, 'oldest'])->name('{{tableNameKebabCasePlural}}.oldest');`,
      repositoryMethod: "oldest(string $column = 'created_at'): ?Model",
      repositoryContent: 'return $this->model->oldest($column)->first();',
      serviceMethod: "oldest(string $column = 'created_at'): ?Model",
      serviceContent: `
      return $this->repository->oldest($column);
      `,
      controllerMethod: 'oldest(Request $request)',
      controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->service->oldest($column);
      return response()->json($item);
      `,
    },
    {
      route: `// Order records by a specific column and direction
        Route::get('{{tableNameKebabCasePlural}}/order-by', [{{tableNamePascalCase}}Controller::class, 'orderBy'])->name('{{tableNameKebabCasePlural}}.order-by');`,
      repositoryMethod: "orderBy(string $column, string $direction = 'asc'): Collection",
      repositoryContent: 'return $this->model->orderBy($column, $direction)->get();',
      serviceMethod: "orderBy(string $column, string $direction = 'asc'): Collection",
      serviceContent: `
      return $this->repository->orderBy($column, $direction);
      `,
      controllerMethod: 'orderBy(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $direction = $request->input('direction', 'asc');
      $items = $this->service->orderBy($column, $direction);
      return response()->json($items);
      `,
    },
    {
      route: `// Group records by a specific column
        Route::get('{{tableNameKebabCasePlural}}/group-by', [{{tableNamePascalCase}}Controller::class, 'groupBy'])->name('{{tableNameKebabCasePlural}}.group-by');`,
      repositoryMethod: 'groupBy(string $column): Collection',
      repositoryContent: 'return $this->model->groupBy($column)->get();',
      serviceMethod: 'groupBy(string $column): Collection',
      serviceContent: `
      return $this->repository->groupBy($column);
      `,
      controllerMethod: 'groupBy(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $items = $this->service->groupBy($column);
      return response()->json($items);
      `,
    },
  ],
};
