<?php
//{{ownerComment}}

namespace App\Repositories;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use App\Repositories\BaseInterface;

abstract class BaseRepository implements BaseInterface
{
    protected Model $model;

    public function __construct(Model $model)
    {
        $this->model = $model;
    }

    public function getAll(): Collection
    {
        return $this->model->all();
    }

    public function findById(int $id): ?Model
    {
        return $this->model->find($id);
    }

    public function create(array $data): Model
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data): bool
    {
        $record = $this->model->find($id);
        return $record ? $record->update($data) : false;
    }

    public function delete(int $id): bool
    {
        $record = $this->model->find($id);
        return $record ? $record->delete() : false;
    }

    public function findByAttributes(array $attributes): ?Model
    {
        return $this->model->where($attributes)->first();
    }

    public function paginate(int $perPage = 15)
    {
        return $this->model->paginate($perPage);
    }

    public function search(string $query, array $fields, int $perPage = 15)
    {
        return $this->model->where(function ($q) use ($query, $fields) {
            foreach ($fields as $field) {
                $q->orWhere($field, 'LIKE', "%$query%");
            }
        })->paginate($perPage);
    }

    public function count(array $criteria = []): int
    {
        return $this->model->where($criteria)->count();
    }

    public function getWithRelations(array $relations): Collection
    {
        return $this->model->with($relations)->get();
    }

    public function findOrFail(int $id): Model
    {
        return $this->model->findOrFail($id);
    }

    public function updateOrCreate(array $attributes, array $values = []): Model
    {
        return $this->model->updateOrCreate($attributes, $values);
    }

    public function softDelete(int $id): bool
    {
        $record = $this->model->find($id);
        return $record ? $record->delete() : false;
    }

    public function restore(int $id): bool
    {
        $record = $this->model->onlyTrashed()->find($id);
        return $record ? $record->restore() : false;
    }

    public function batchUpdate(array $criteria, array $data): bool
    {
        return $this->model->where($criteria)->update($data) > 0;
    }

    public function exists(array $criteria): bool
    {
        return $this->model->where($criteria)->exists();
    }

    public function pluck(string $column, string $key = null): Collection
    {
        return $this->model->pluck($column, $key);
    }

    public function firstOrCreate(array $attributes, array $values = []): Model
    {
        return $this->model->firstOrCreate($attributes, $values);
    }

    public function firstOrNew(array $attributes, array $values = []): Model
    {
        return $this->model->firstOrNew($attributes, $values);
    }

    public function chunk(int $size, callable $callback): bool
    {
        return $this->model->chunk($size, $callback);
    }

    public function each(callable $callback): bool
    {
        return $this->model->each($callback);
    }

    public function random(int $count = 1): Collection
    {
        return $this->model->inRandomOrder()->limit($count)->get();
    }

    public function latest(string $column = 'created_at'): ?Model
    {
        return $this->model->latest($column)->first();
    }

    public function oldest(string $column = 'created_at'): ?Model
    {
        return $this->model->oldest($column)->first();
    }

    public function findMany(array $ids): Collection
    {
        return $this->model->findMany($ids);
    }

    public function whereIn(string $column, array $values): Collection
    {
        return $this->model->whereIn($column, $values)->get();
    }

    public function whereNotIn(string $column, array $values): Collection
    {
        return $this->model->whereNotIn($column, $values)->get();
    }

    public function whereBetween(string $column, array $range): Collection
    {
        return $this->model->whereBetween($column, $range)->get();
    }

    public function withTrashed(): Collection
    {
        return $this->model->withTrashed()->get();
    }

    public function onlyTrashed(): Collection
    {
        return $this->model->onlyTrashed()->get();
    }

    public function withoutTrashed(): Collection
    {
        return $this->model->withoutTrashed()->get();
    }

    public function orderBy(string $column, string $direction = 'asc'): Collection
    {
        return $this->model->orderBy($column, $direction)->get();
    }

    public function groupBy(string $column): Collection
    {
        return $this->model->groupBy($column)->get();
    }
}
