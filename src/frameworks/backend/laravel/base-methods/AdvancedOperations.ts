import { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure';

export default {
  group: 'Advanced Operations',
  methods: [
    {
      methodName: 'getWithRelations',
      route: `Route::get('{{tableNameKebabCasePlural}}/with-relations', [{{tableNamePascalCase}}Controller::class, 'getWithRelations'])->name('{{tableNameKebabCasePlural}}.with-relations');`,
      description: 'Retrieve related models',
      repositoryMethod: 'getWithRelations(array $relations): Collection',
      repositoryContent: 'return $this->model->with($relations)->get();',
      serviceMethod: 'getWithRelations(array $relations): Collection',
      serviceContent: `
        return $this->repository->getWithRelations($relations);
      `,
      controllerMethod: 'getWithRelations(Request $request)',
      controllerContent: `
        $relations = $request->input('relations', []);
        $items = $this->service->getWithRelations($relations);
        return response()->json($items);
      `,
    },
    {
      methodName: 'pluck',
      route: `Route::get('{{tableNameKebabCasePlural}}/pluck', [{{tableNamePascalCase}}Controller::class, 'pluck'])->name('{{tableNameKebabCasePlural}}.pluck');`,
      description: 'Retrieve a list of specific column values',
      repositoryMethod: 'pluck(string $column, string $key = null): Collection',
      repositoryContent: 'return $this->model->pluck($column, $key);',
      serviceMethod: 'pluck(string $column, string $key = null): Collection',
      serviceContent: `
        return $this->repository->pluck($column, $key);
      `,
      controllerMethod: 'pluck(Request $request)',
      controllerContent: `
        $column = $request->input('column');
        $key = $request->input('key', null);
        $values = $this->service->pluck($column, $key);
        return response()->json($values);
      `,
    },
    {
      methodName: 'firstOrCreate',
      route: `Route::post('{{tableNameKebabCasePlural}}/first-or-create', [{{tableNamePascalCase}}Controller::class, 'firstOrCreate'])->name('{{tableNameKebabCasePlural}}.first-or-create');`,
      description: 'Find or create a record',
      repositoryMethod:
        'firstOrCreate(array $attributes, array $values = []): Model',
      repositoryContent:
        'return $this->model->firstOrCreate($attributes, $values);',
      serviceMethod:
        'firstOrCreate(array $attributes, array $values = []): Model',
      serviceContent: `
        return $this->repository->firstOrCreate($attributes, $values);
      `,
      controllerMethod: 'firstOrCreate(Request $request)',
      controllerContent: `
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->service->firstOrCreate($attributes, $values);
        return response()->json($item);
      `,
    },
    {
      methodName: 'firstOrNew',
      route: `Route::post('{{tableNameKebabCasePlural}}/first-or-new', [{{tableNamePascalCase}}Controller::class, 'firstOrNew'])->name('{{tableNameKebabCasePlural}}.first-or-new');`,
      description: 'Find or return a new record instance',
      repositoryMethod:
        'firstOrNew(array $attributes, array $values = []): Model',
      repositoryContent:
        'return $this->model->firstOrNew($attributes, $values);',
      serviceMethod: 'firstOrNew(array $attributes, array $values = []): Model',
      serviceContent: `
        return $this->repository->firstOrNew($attributes, $values);
      `,
      controllerMethod: 'firstOrNew(Request $request)',
      controllerContent: `
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->service->firstOrNew($attributes, $values);
        return response()->json($item);
      `,
    },
    {
      methodName: 'chunk',
      route: `Route::post('{{tableNameKebabCasePlural}}/chunk', [{{tableNamePascalCase}}Controller::class, 'chunk'])->name('{{tableNameKebabCasePlural}}.chunk');`,
      description: 'Chunk records for processing',
      repositoryMethod: 'chunk(int $size, callable $callback): bool',
      repositoryContent: 'return $this->model->chunk($size, $callback);',
      serviceMethod: 'chunk(int $size, callable $callback): bool',
      serviceContent: `
        return $this->repository->chunk($size, $callback);
      `,
      controllerMethod: 'chunk(Request $request)',
      controllerContent: `
        $size = $request->input('size', 100);
        $callback = function ($items) {
            return response()->json($items);
        };
        $this->service->chunk($size, $callback);
      `,
    },
    {
      methodName: 'each',
      route: `Route::post('{{tableNameKebabCasePlural}}/each', [{{tableNamePascalCase}}Controller::class, 'each'])->name('{{tableNameKebabCasePlural}}.each');`,
      description: 'Process each record individually',
      repositoryMethod: 'each(callable $callback): bool',
      repositoryContent: 'return $this->model->each($callback);',
      serviceMethod: 'each(callable $callback): bool',
      serviceContent: `
        return $this->repository->each($callback);
      `,
      controllerMethod: 'each()',
      controllerContent: `
        $callback = function ($item) {
            return response()->json($item);
        };
        $this->service->each($callback);
      `,
    },
    {
      methodName: 'whereIn',
      route: `Route::post('{{tableNameKebabCasePlural}}/where-in', [{{tableNamePascalCase}}Controller::class, 'whereIn'])->name('{{tableNameKebabCasePlural}}.where-in');`,
      description: 'Filter records based on a set of values',
      repositoryMethod: 'whereIn(string $column, array $values): Collection',
      repositoryContent:
        'return $this->model->whereIn($column, $values)->get();',
      serviceMethod: 'whereIn(string $column, array $values): Collection',
      serviceContent: `
        return $this->repository->whereIn($column, $values);
      `,
      controllerMethod: 'whereIn(Request $request)',
      controllerContent: `
        $column = $request->input('column');
        $values = $request->input('values', []);
        $items = $this->service->whereIn($column, $values);
        return response()->json($items);
      `,
    },
    {
      methodName: 'whereNotIn',
      route: `Route::post('{{tableNameKebabCasePlural}}/where-not-in', [{{tableNamePascalCase}}Controller::class, 'whereNotIn'])->name('{{tableNameKebabCasePlural}}.where-not-in');`,
      description: 'Filter records excluding a set of values',
      repositoryMethod: 'whereNotIn(string $column, array $values): Collection',
      repositoryContent:
        'return $this->model->whereNotIn($column, $values)->get();',
      serviceMethod: 'whereNotIn(string $column, array $values): Collection',
      serviceContent: `
        return $this->repository->whereNotIn($column, $values);
      `,
      controllerMethod: 'whereNotIn(Request $request)',
      controllerContent: `
        $column = $request->input('column');
        $values = $request->input('values', []);
        $items = $this->service->whereNotIn($column, $values);
        return response()->json($items);
      `,
    },
    {
      methodName: 'whereBetween',
      route: `Route::post('{{tableNameKebabCasePlural}}/where-between', [{{tableNamePascalCase}}Controller::class, 'whereBetween'])->name('{{tableNameKebabCasePlural}}.where-between');`,
      description: 'Filter records between two values',
      repositoryMethod:
        'whereBetween(string $column, array $range): Collection',
      repositoryContent:
        'return $this->model->whereBetween($column, $range)->get();',
      serviceMethod: 'whereBetween(string $column, array $range): Collection',
      serviceContent: `
        return $this->repository->whereBetween($column, $range);
      `,
      controllerMethod: 'whereBetween(Request $request)',
      controllerContent: `
        $column = $request->input('column');
        $range = $request->input('range', []);
        $items = $this->service->whereBetween($column, $range);
        return response()->json($items);
      `,
    },
  ],
} satisfies IRepositoryStructure;
