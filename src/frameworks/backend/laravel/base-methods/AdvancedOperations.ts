import type { IRepositoryStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Advanced Operations',
  methods: [
    {
      methodName: 'getWithRelations',
      route: `Route::get('{{tableName.plural.kebabCase}}/with-relations', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.with-relations');`,
      description: 'Retrieve related models',
      repositoryMethod: '{{methodName}}(array $relations): Collection',
      repositoryContent: 'return $this->model->with($relations)->get();',
      serviceMethod: '{{methodName}}(array $relations): Collection',
      serviceContent: `
        return $this->repository->{{methodName}}($relations);
      `,
      controllerMethod: '{{methodName}}(Request $request)',
      controllerContent: `
        $relations = $request->input('relations', []);
        $items = $this->service->{{methodName}}($relations);
        return response()->json($items);
      `,
    },
    {
      methodName: 'pluck',
      route: `Route::get('{{tableName.plural.kebabCase}}/pluck', [{{tableName.pascalCase}}Controller::class, 'pluck'])->name('{{tableName.plural.kebabCase}}.pluck');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/first-or-create', [{{tableName.pascalCase}}Controller::class, 'firstOrCreate'])->name('{{tableName.plural.kebabCase}}.first-or-create');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/first-or-new', [{{tableName.pascalCase}}Controller::class, 'firstOrNew'])->name('{{tableName.plural.kebabCase}}.first-or-new');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/chunk', [{{tableName.pascalCase}}Controller::class, 'chunk'])->name('{{tableName.plural.kebabCase}}.chunk');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/each', [{{tableName.pascalCase}}Controller::class, 'each'])->name('{{tableName.plural.kebabCase}}.each');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/where-in', [{{tableName.pascalCase}}Controller::class, 'whereIn'])->name('{{tableName.plural.kebabCase}}.where-in');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/where-not-in', [{{tableName.pascalCase}}Controller::class, 'whereNotIn'])->name('{{tableName.plural.kebabCase}}.where-not-in');`,
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
      route: `Route::post('{{tableName.plural.kebabCase}}/where-between', [{{tableName.pascalCase}}Controller::class, 'whereBetween'])->name('{{tableName.plural.kebabCase}}.where-between');`,
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
