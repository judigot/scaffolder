export default {
  group: 'Advanced Operations',
  methods: [
    {
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
      repositoryMethod: 'firstOrCreate(array $attributes, array $values = []): Model',
      repositoryContent: 'return $this->model->firstOrCreate($attributes, $values);',
      serviceMethod: 'firstOrCreate(array $attributes, array $values = []): Model',
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
      repositoryMethod: 'firstOrNew(array $attributes, array $values = []): Model',
      repositoryContent: 'return $this->model->firstOrNew($attributes, $values);',
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
      repositoryMethod: 'whereIn(string $column, array $values): Collection',
      repositoryContent: 'return $this->model->whereIn($column, $values)->get();',
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
      repositoryMethod: 'whereNotIn(string $column, array $values): Collection',
      repositoryContent: 'return $this->model->whereNotIn($column, $values)->get();',
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
      repositoryMethod: 'whereBetween(string $column, array $range): Collection',
      repositoryContent: 'return $this->model->whereBetween($column, $range)->get();',
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
};
