export default {
  group: 'Advanced Operations',
  methods: [
    {
      repositoryMethod: 'getWithRelations(array $relations): Collection',
      repositoryContent: 'return $this->model->with($relations)->get();',
      controllerMethod: 'getWithRelations(Request $request)',
      controllerContent: `
      $relations = $request->input('relations', []);
      $items = $this->repository->getWithRelations($relations);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'pluck(string $column, string $key = null): Collection',
      repositoryContent: 'return $this->model->pluck($column, $key);',
      controllerMethod: 'pluck(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $key = $request->input('key', null);
      $values = $this->repository->pluck($column, $key);
      return response()->json($values);
      `,
    },
    {
      repositoryMethod: 'firstOrCreate(array $attributes, array $values = []): Model',
      repositoryContent:
      'return $this->model->firstOrCreate($attributes, $values);',
      controllerMethod: 'firstOrCreate(Request $request)',
      controllerContent: `
      $attributes = $request->input('attributes', []);
      $values = $request->input('values', []);
      $item = $this->repository->firstOrCreate($attributes, $values);
      return response()->json($item);
      `,
    },
    {
      repositoryMethod: 'firstOrNew(array $attributes, array $values = []): Model',
      repositoryContent:
      'return $this->model->firstOrNew($attributes, $values);',
      controllerMethod: 'firstOrNew(Request $request)',
      controllerContent: `
      $attributes = $request->input('attributes', []);
      $values = $request->input('values', []);
      $item = $this->repository->firstOrNew($attributes, $values);
      return response()->json($item);
      `,
    },
    {
      repositoryMethod: 'chunk(int $size, callable $callback): bool',
      repositoryContent: 'return $this->model->chunk($size, $callback);',
      controllerMethod: 'chunk(Request $request)',
      controllerContent: `
      $size = $request->input('size', 100);
      $callback = function ($items) {
          return response()->json($items);
      };
      $this->repository->chunk($size, $callback);
      `,
    },
    {
      repositoryMethod: 'each(callable $callback): bool',
      repositoryContent: 'return $this->model->each($callback);',
      controllerMethod: 'each()',
      controllerContent: `
      $callback = function ($item) {
          return response()->json($item);
      };
      $this->repository->each($callback);
      `,
    },
    {
      repositoryMethod: 'whereIn(string $column, array $values): Collection',
      repositoryContent:
      'return $this->model->whereIn($column, $values)->get();',
      controllerMethod: 'whereIn(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $values = $request->input('values', []);
      $items = $this->repository->whereIn($column, $values);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'whereNotIn(string $column, array $values): Collection',
      repositoryContent:
      'return $this->model->whereNotIn($column, $values)->get();',
      controllerMethod: 'whereNotIn(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $values = $request->input('values', []);
      $items = $this->repository->whereNotIn($column, $values);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'whereBetween(string $column, array $range): Collection',
      repositoryContent:
      'return $this->model->whereBetween($column, $range)->get();',
      controllerMethod: 'whereBetween(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $range = $request->input('range', []);
      $items = $this->repository->whereBetween($column, $range);
      return response()->json($items);
      `,
    },
  ],
};
