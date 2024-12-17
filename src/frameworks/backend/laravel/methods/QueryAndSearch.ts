export default {
  group: 'Query and Search',
  methods: [
    {
      repositoryMethod: 'findByAttributes(array $attributes): ?Model',
      repositoryContent: 'return $this->model->where($attributes)->first();',
      controllerMethod: 'findByAttributes(Request $request)',
      controllerContent: `
      $attributes = $request->all();
      $item = $this->repository->findByAttributes($attributes);
      return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
    },
    {
      repositoryMethod: 'paginate(int $perPage = 15)',
      repositoryContent: 'return $this->model->paginate($perPage);',
      controllerMethod: 'paginate(Request $request)',
      controllerContent: `
      $perPage = $request->input('per_page', 15);
      $items = $this->repository->paginate($perPage);
      return response()->json($items);
      `,
    },
    {
      repositoryMethod:
        'search(string $query, array $fields, int $perPage = 15)',
      repositoryContent: `
      return $this->model->where(function ($q) use ($query, $fields) {
        foreach ($fields as $field) {
          $q->orWhere($field, 'LIKE', "%$query%");
          }
          })->paginate($perPage);
          `,
      controllerMethod: 'search(Request $request)',
      controllerContent: `
      $query = $request->input('query');
      $fields = $request->input('fields', []);
      $perPage = $request->input('per_page', 15);
      $results = $this->repository->search($query, $fields, $perPage);
      return response()->json($results);
      `,
    },
    {
      repositoryMethod: 'count(array $criteria = []): int',
      repositoryContent: 'return $this->model->where($criteria)->count();',
      controllerMethod: 'count(Request $request)',
      controllerContent: `
      $criteria = $request->all();
      $count = $this->repository->count($criteria);
      return response()->json(['count' => $count]);
      `,
    },
    {
      repositoryMethod: 'exists(array $criteria): bool',
      repositoryContent: 'return $this->model->where($criteria)->exists();',
      controllerMethod: 'exists(Request $request)',
      controllerContent: `
      $criteria = $request->all();
      $exists = $this->repository->exists($criteria);
      return response()->json(['exists' => $exists]);
      `,
    },
  ],
};
