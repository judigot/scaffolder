export default {
  group: 'Retrieval and Sorting',
  methods: [
    {
      route: "",
      repositoryMethod: 'findOrFail(int $id): Model',
      repositoryContent: 'return $this->model->findOrFail($id);',
      serviceMethod: 'findOrFail(int $id): Model',
      serviceContent: `
      return $this->repository->findOrFail($id);
      `,
      controllerMethod: 'findOrFail($id)',
      controllerContent: `
      $item = $this->service->findOrFail($id);
      return response()->json($item);
      `,
    },
    {
      route: "",
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
      route: "",
      repositoryMethod: 'random(int $count = 1): Collection',
      repositoryContent:
        'return $this->model->inRandomOrder()->limit($count)->get();',
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
      route: "",
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
      route: "",
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
      route: "",
      repositoryMethod:
        "orderBy(string $column, string $direction = 'asc'): Collection",
      repositoryContent:
        'return $this->model->orderBy($column, $direction)->get();',
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
      route: "",
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
