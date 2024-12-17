import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';

const methodsAndContent = [
  // CRUD Operations
  {
    group: 'CRUD Operations',
    methods: [
      {
        method: 'getAll(): Collection',
        repositoryContent: 'return $this->model->all();',
      },
      {
        method: 'findById(int $id): ?Model',
        repositoryContent: 'return $this->model->find($id);',
      },
      {
        method: 'create(array $data): Model',
        repositoryContent: 'return $this->model->create($data);',
      },
      {
        method: 'update(int $id, array $data): bool',
        repositoryContent: `
          $record = $this->model->find($id);
          return $record ? $record->update($data) : false;
      `,
      },
      {
        method: 'delete(int $id): bool',
        repositoryContent: `
          $record = $this->model->find($id);
          return $record ? $record->delete() : false;
      `,
      },
    ],
  },
  // Query and Search
  {
    group: 'Query and Search',
    methods: [
      {
        method: 'findByAttributes(array $attributes): ?Model',
        repositoryContent: 'return $this->model->where($attributes)->first();',
      },
      {
        method: 'paginate(int $perPage = 15)',
        repositoryContent: 'return $this->model->paginate($perPage);',
      },
      {
        method: 'search(string $query, array $fields, int $perPage = 15)',
        repositoryContent: `
          return $this->model->where(function ($q) use ($query, $fields) {
              foreach ($fields as $field) {
                  $q->orWhere($field, 'LIKE', "%$query%");
              }
          })->paginate($perPage);
      `,
      },
      {
        method: 'count(array $criteria = []): int',
        repositoryContent: 'return $this->model->where($criteria)->count();',
      },
      {
        method: 'exists(array $criteria): bool',
        repositoryContent: 'return $this->model->where($criteria)->exists();',
      },
    ],
  },
  // Relationships
  {
    group: 'Relationships',
    methods: [
      {
        method: 'getWithRelations(array $relations): Collection',
        repositoryContent: 'return $this->model->with($relations)->get();',
      },
    ],
  },
  // Soft Deletes and Restoration
  {
    group: 'Soft Deletes and Restoration',
    methods: [
      {
        method: 'softDelete(int $id): bool',
        repositoryContent: `
          $record = $this->model->find($id);
          return $record ? $record->delete() : false;
      `,
      },
      {
        method: 'restore(int $id): bool',
        repositoryContent: `
          $record = $this->model->onlyTrashed()->find($id);
          return $record ? $record->restore() : false;
      `,
      },
      {
        method: 'withTrashed(): Collection',
        repositoryContent: 'return $this->model->withTrashed()->get();',
      },
      {
        method: 'onlyTrashed(): Collection',
        repositoryContent: 'return $this->model->onlyTrashed()->get();',
      },
      {
        method: 'withoutTrashed(): Collection',
        repositoryContent: 'return $this->model->withoutTrashed()->get();',
      },
    ],
  },
  // Bulk Operations
  {
    group: 'Bulk Operations',
    methods: [
      {
        method: 'batchUpdate(array $criteria, array $data): bool',
        repositoryContent:
          'return $this->model->where($criteria)->update($data) > 0;',
      },
      {
        method: 'updateOrCreate(array $attributes, array $values = []): Model',
        repositoryContent:
          'return $this->model->updateOrCreate($attributes, $values);',
      },
    ],
  },
  // Retrieval and Sorting
  {
    group: 'Retrieval and Sorting',
    methods: [
      {
        method: 'findOrFail(int $id): Model',
        repositoryContent: 'return $this->model->findOrFail($id);',
      },
      {
        method: 'findMany(array $ids): Collection',
        repositoryContent: 'return $this->model->findMany($ids);',
      },
      {
        method: 'random(int $count = 1): Collection',
        repositoryContent:
          'return $this->model->inRandomOrder()->limit($count)->get();',
      },
      {
        method: "latest(string $column = 'created_at'): ?Model",
        repositoryContent: 'return $this->model->latest($column)->first();',
      },
      {
        method: "oldest(string $column = 'created_at'): ?Model",
        repositoryContent: 'return $this->model->oldest($column)->first();',
      },
      {
        method:
          "orderBy(string $column, string $direction = 'asc'): Collection",
        repositoryContent:
          'return $this->model->orderBy($column, $direction)->get();',
      },
      {
        method: 'groupBy(string $column): Collection',
        repositoryContent: 'return $this->model->groupBy($column)->get();',
      },
    ],
  },
  // Advanced Operations
  {
    group: 'Advanced Operations',
    methods: [
      {
        method: 'pluck(string $column, string $key = null): Collection',
        repositoryContent: 'return $this->model->pluck($column, $key);',
      },
      {
        method: 'firstOrCreate(array $attributes, array $values = []): Model',
        repositoryContent:
          'return $this->model->firstOrCreate($attributes, $values);',
      },
      {
        method: 'firstOrNew(array $attributes, array $values = []): Model',
        repositoryContent:
          'return $this->model->firstOrNew($attributes, $values);',
      },
      {
        method: 'chunk(int $size, callable $callback): bool',
        repositoryContent: 'return $this->model->chunk($size, $callback);',
      },
      {
        method: 'each(callable $callback): bool',
        repositoryContent: 'return $this->model->each($callback);',
      },
      {
        method: 'whereIn(string $column, array $values): Collection',
        repositoryContent:
          'return $this->model->whereIn($column, $values)->get();',
      },
      {
        method: 'whereNotIn(string $column, array $values): Collection',
        repositoryContent:
          'return $this->model->whereNotIn($column, $values)->get();',
      },
      {
        method: 'whereBetween(string $column, array $range): Collection',
        repositoryContent:
          'return $this->model->whereBetween($column, $range)->get();',
      },
    ],
  },
];

const createBaseInterfaceAndRepository = (
  type: 'interface' | 'repository',
): IFile => {
  const methods = methodsAndContent
    .map(({ group, methods }) => {
      const groupHeader = `\n    // ${group}`;
      const groupMethods = methods
        .map(({ method, repositoryContent }) => {
          if (type === 'interface') {
            return `    public function ${method};`;
          } else {
            const methodName = method.split('(')[0];
            const content = repositoryContent
              ? repositoryContent
                  .trim()
                  .split('\n')
                  .map((line) => `        ${line.trim()}`)
                  .join('\n')
              : `// TODO: Implement ${methodName}`;
            return `
    public function ${method}
    {
${content}
    }`;
          }
        })
        .join('\n'); // Add spacing between methods
      return groupHeader + '\n' + groupMethods;
    })
    .join('\n');

  const template =
    type === 'interface'
      ? `
<?php

namespace App\\Repositories;

use Illuminate\\Support\\Collection;
use Illuminate\\Database\\Eloquent\\Model;

interface BaseInterface
{
${methods}
}
`
      : `
<?php

namespace App\\Repositories;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Support\\Collection;
use App\\Repositories\\BaseInterface;

abstract class BaseRepository implements BaseInterface
{
    protected Model $model;

    public function __construct(Model $model)
    {
        $this->model = $model;
    }
${methods}
}
`;

  const content = createFile({ template, replacements: {} });

  return {
    type: 'file',
    name: type === 'interface' ? 'BaseInterface.php' : 'BaseRepository.php',
    content,
  };
};

export default createBaseInterfaceAndRepository;
