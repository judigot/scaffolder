import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';

const createBaseInterface = (): IFile => {
  const template = `
<?php

namespace App\\Repositories;

use Illuminate\\Support\\Collection;
use Illuminate\\Database\\Eloquent\\Model;

/**
 * Interface BaseInterface
 * Common contract for all repositories.
 */
interface BaseInterface
{
    // CRUD Operations
    public function getAll(): Collection;
    public function findById(int $id): ?Model;
    public function create(array $data): Model;
    public function update(int $id, array $data): bool;
    public function delete(int $id): bool;

    // Query and Search
    public function findByAttributes(array $attributes): ?Model;
    public function paginate(int $perPage = 15);
    public function search(string $query, array $fields, int $perPage = 15);
    public function count(array $criteria = []): int;
    public function exists(array $criteria): bool; // <-- Missing method restored

    // Relationships
    public function getWithRelations(array $relations): Collection;

    // Soft Deletes and Restoration
    public function softDelete(int $id): bool;
    public function restore(int $id): bool;
    public function withTrashed(): Collection;
    public function onlyTrashed(): Collection;
    public function withoutTrashed(): Collection;

    // Bulk and Conditional Updates
    public function batchUpdate(array $criteria, array $data): bool;
    public function updateOrCreate(array $attributes, array $values = []): Model;

    // Retrieval and Sorting
    public function findOrFail(int $id): Model;
    public function pluck(string $column, string $key = null): Collection;
    public function random(int $count = 1): Collection;
    public function latest(string $column = 'created_at'): ?Model;
    public function oldest(string $column = 'created_at'): ?Model;

    // Grouping and Conditions
    public function findMany(array $ids): Collection;
    public function whereIn(string $column, array $values): Collection;
    public function whereNotIn(string $column, array $values): Collection;
    public function whereBetween(string $column, array $range): Collection;
    public function orderBy(string $column, string $direction = 'asc'): Collection;
    public function groupBy(string $column): Collection;

    // Advanced Operations
    public function firstOrCreate(array $attributes, array $values = []): Model;
    public function firstOrNew(array $attributes, array $values = []): Model;
    public function chunk(int $size, callable $callback): bool;
    public function each(callable $callback): bool;
}
`;

  const replacements = {};

  const content = createFile({ template, replacements });

  return {
    type: 'file',
    name: 'BaseInterface.php',
    content,
  };
};

export default createBaseInterface;
