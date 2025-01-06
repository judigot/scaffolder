import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Retrieval and Sorting',
  methods: [
    // Can be commented since Route::apiResource already handles findOrFail
    {
      methodName: 'findOrFail',
      route: `Route::get('{{tableNameKebabCasePlural}}/{id}/find-or-fail', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.find-or-fail');`,
      description: 'Find a record or throw an exception if not found',
      repositoryMethod: '{{methodName}}(int $id): Model',
      repositoryContent: 'return $this->model->findOrFail($id);',
      serviceMethod: '{{methodName}}(int $id): Model',
      serviceContent: `
      return $this->repository->{{methodName}}($id);
      `,
      controllerMethod: '{{methodName}}($id)',
      controllerContent: `
      $item = $this->service->{{methodName}}($id);
      return response()->json($item);
      `,
    },
    {
      methodName: 'findMany',
      route: `Route::post('{{tableNameKebabCasePlural}}/find-many', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.find-many');`,
      description: 'Find multiple records by their IDs',
      repositoryMethod: '{{methodName}}(array $ids): Collection',
      repositoryContent: 'return $this->model->findMany($ids);',
      serviceMethod: '{{methodName}}(array $ids): Collection',
      serviceContent: `
      return $this->repository->{{methodName}}($ids);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $ids = $request->input('ids', []);
      $items = $this->service->{{methodName}}($ids);
      return response()->json($items);
      `,
    },
    {
      methodName: 'random',
      route: `Route::get('{{tableNameKebabCasePlural}}/random', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.random');`,
      description: 'Retrieve random records',
      repositoryMethod: '{{methodName}}(int $count = 1): Collection',
      repositoryContent:
        'return $this->model->inRandomOrder()->limit($count)->get();',
      serviceMethod: '{{methodName}}(int $count = 1): Collection',
      serviceContent: `
      return $this->repository->{{methodName}}($count);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $count = $request->input('count', 1);
      $items = $this->service->{{methodName}}($count);
      return response()->json($items);
      `,
    },
    {
      methodName: 'latest',
      route: `Route::get('{{tableNameKebabCasePlural}}/latest', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.latest');`,
      description: 'Retrieve the latest record based on a column',
      repositoryMethod: "{{methodName}}(string $column = 'created_at'): ?Model",
      repositoryContent: 'return $this->model->latest($column)->first();',
      serviceMethod: "{{methodName}}(string $column = 'created_at'): ?Model",
      serviceContent: `
      return $this->repository->{{methodName}}($column);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->service->{{methodName}}($column);
      return response()->json($item);
      `,
    },
    {
      methodName: 'oldest',
      route: `Route::get('{{tableNameKebabCasePlural}}/oldest', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.oldest');`,
      description: 'Retrieve the oldest record based on a column',
      repositoryMethod: "{{methodName}}(string $column = 'created_at'): ?Model",
      repositoryContent: 'return $this->model->oldest($column)->first();',
      serviceMethod: "{{methodName}}(string $column = 'created_at'): ?Model",
      serviceContent: `
      return $this->repository->{{methodName}}($column);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->service->{{methodName}}($column);
      return response()->json($item);
      `,
    },
    {
      methodName: 'orderBy',
      route: `Route::get('{{tableNameKebabCasePlural}}/order-by', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.order-by');`,
      description: 'Order records by a specific column and direction',
      repositoryMethod:
        "{{methodName}}(string $column, string $direction = 'asc'): Collection",
      repositoryContent:
        'return $this->model->orderBy($column, $direction)->get();',
      serviceMethod:
        "{{methodName}}(string $column, string $direction = 'asc'): Collection",
      serviceContent: `
      return $this->repository->{{methodName}}($column, $direction);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $direction = $request->input('direction', 'asc');
      $items = $this->service->{{methodName}}($column, $direction);
      return response()->json($items);
      `,
    },
    {
      methodName: 'groupBy',
      route: `Route::get('{{tableNameKebabCasePlural}}/group-by', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.group-by');`,
      description: 'Group records by a specific column',
      repositoryMethod: '{{methodName}}(string $column): Collection',
      repositoryContent: 'return $this->model->groupBy($column)->get();',
      serviceMethod: '{{methodName}}(string $column): Collection',
      serviceContent: `
      return $this->repository->{{methodName}}($column);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $items = $this->service->{{methodName}}($column);
      return response()->json($items);
      `,
    },
  ],
} satisfies IRepositoryStructure;
