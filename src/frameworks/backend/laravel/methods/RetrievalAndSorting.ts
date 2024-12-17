export default {
  group: 'Retrieval and Sorting',
  methods: [
    {
      repositoryMethod: 'findOrFail(int $id): Model',
      repositoryContent: 'return $this->model->findOrFail($id);',
      controllerMethod: 'findOrFail($id)',
      controllerContent: `
      $item = $this->repository->findOrFail($id);
      return response()->json($item);
      `,
    },
    {
      repositoryMethod: 'findMany(array $ids): Collection',
      repositoryContent: 'return $this->model->findMany($ids);',
      controllerMethod: 'findMany(Request $request)',
      controllerContent: `
      $ids = $request->input('ids', []);
      $items = $this->repository->findMany($ids);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'random(int $count = 1): Collection',
      repositoryContent:
      'return $this->model->inRandomOrder()->limit($count)->get();',
      controllerMethod: 'random(Request $request)',
      controllerContent: `
      $count = $request->input('count', 1);
      $items = $this->repository->random($count);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: "latest(string $column = 'created_at'): ?Model",
      repositoryContent: 'return $this->model->latest($column)->first();',
      controllerMethod: 'latest(Request $request)',
      controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->repository->latest($column);
      return response()->json($item);
      `,
    },
    {
      repositoryMethod: "oldest(string $column = 'created_at'): ?Model",
      repositoryContent: 'return $this->model->oldest($column)->first();',
      controllerMethod: 'oldest(Request $request)',
      controllerContent: `
      $column = $request->input('column', 'created_at');
      $item = $this->repository->oldest($column);
      return response()->json($item);
      `,
    },
    {
      repositoryMethod: "orderBy(string $column, string $direction = 'asc'): Collection",
      repositoryContent:
      'return $this->model->orderBy($column, $direction)->get();',
      controllerMethod: 'orderBy(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $direction = $request->input('direction', 'asc');
      $items = $this->repository->orderBy($column, $direction);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod: 'groupBy(string $column): Collection',
      repositoryContent: 'return $this->model->groupBy($column)->get();',
      controllerMethod: 'groupBy(Request $request)',
      controllerContent: `
      $column = $request->input('column');
      $items = $this->repository->groupBy($column);
      return response()->json($items);
      `,
    },
  ],
};
