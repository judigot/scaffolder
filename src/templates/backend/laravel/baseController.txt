<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class BaseController
{
    protected $repository;

    public function index()
    {
        $items = $this->repository->getAll();
        return response()->json($items);
    }

    public function show($id)
    {
        $item = $this->repository->findById($id);
        if ($item) {
            return response()->json($item);
        }
        return response()->json(['message' => 'Resource not found'], 404);
    }

    public function store(Request $request)
    {
        $item = $this->repository->create($request->all());
        return response()->json($item, 201);
    }

    public function update(Request $request, $id)
    {
        $updated = $this->repository->update($id, $request->all());
        if ($updated) {
            return response()->json(['message' => 'Resource updated']);
        }
        return response()->json(['message' => 'Resource not found'], 404);
    }

    public function destroy($id)
    {
        $deleted = $this->repository->delete($id);
        if ($deleted) {
            return response()->json(['message' => 'Resource deleted']);
        }
        return response()->json(['message' => 'Resource not found'], 404);
    }

    public function findByAttributes(Request $request)
    {
        $attributes = $request->all();
        $item = $this->repository->findByAttributes($attributes);
        if ($item) {
            return response()->json($item);
        }
        return response()->json(['message' => 'Resource not found'], 404);
    }

    public function paginate(Request $request)
    {
        $perPage = $request->input('per_page', 15);
        $items = $this->repository->paginate($perPage);
        return response()->json($items);
    }

    public function search(Request $request)
    {
        $query = $request->input('query');
        $fields = $request->input('fields', []);
        $perPage = $request->input('per_page', 15);
        $results = $this->repository->search($query, $fields, $perPage);
        return response()->json($results);
    }

    public function count(Request $request)
    {
        $criteria = $request->all();
        $count = $this->repository->count($criteria);
        return response()->json(['count' => $count]);
    }

    public function getWithRelations(Request $request)
    {
        $relations = $request->input('relations', []);
        $items = $this->repository->getWithRelations($relations);
        return response()->json($items);
    }

    public function findOrFail($id)
    {
        $item = $this->repository->findOrFail($id);
        return response()->json($item);
    }

    public function updateOrCreate(Request $request)
    {
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->repository->updateOrCreate($attributes, $values);
        return response()->json($item);
    }

    public function softDelete($id)
    {
        $softDeleted = $this->repository->softDelete($id);
        if ($softDeleted) {
            return response()->json(['message' => 'Resource soft-deleted']);
        }
        return response()->json(['message' => 'Resource not found'], 404);
    }

    public function restore($id)
    {
        $restored = $this->repository->restore($id);
        if ($restored) {
            return response()->json(['message' => 'Resource restored']);
        }
        return response()->json(['message' => 'Resource not found'], 404);
    }

    public function batchUpdate(Request $request)
    {
        $criteria = $request->input('criteria', []);
        $data = $request->input('data', []);
        $updated = $this->repository->batchUpdate($criteria, $data);
        return response()->json(['updated' => $updated]);
    }

    public function exists(Request $request)
    {
        $criteria = $request->all();
        $exists = $this->repository->exists($criteria);
        return response()->json(['exists' => $exists]);
    }

    public function pluck(Request $request)
    {
        $column = $request->input('column');
        $key = $request->input('key', null);
        $values = $this->repository->pluck($column, $key);
        return response()->json($values);
    }

    public function firstOrCreate(Request $request)
    {
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->repository->firstOrCreate($attributes, $values);
        return response()->json($item);
    }

    public function firstOrNew(Request $request)
    {
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->repository->firstOrNew($attributes, $values);
        return response()->json($item);
    }

    public function chunk(Request $request)
    {
        $size = $request->input('size', 100);
        $callback = function ($items) {
            return response()->json($items);
        };
        $this->repository->chunk($size, $callback);
    }

    public function each()
    {
        $callback = function ($item) {
            return response()->json($item);
        };
        $this->repository->each($callback);
    }

    public function random(Request $request)
    {
        $count = $request->input('count', 1);
        $items = $this->repository->random($count);
        return response()->json($items);
    }

    public function latest(Request $request)
    {
        $column = $request->input('column', 'created_at');
        $item = $this->repository->latest($column);
        return response()->json($item);
    }

    public function oldest(Request $request)
    {
        $column = $request->input('column', 'created_at');
        $item = $this->repository->oldest($column);
        return response()->json($item);
    }

    public function findMany(Request $request)
    {
        $ids = $request->input('ids', []);
        $items = $this->repository->findMany($ids);
        return response()->json($items);
    }

    public function whereIn(Request $request)
    {
        $column = $request->input('column');
        $values = $request->input('values', []);
        $items = $this->repository->whereIn($column, $values);
        return response()->json($items);
    }

    public function whereNotIn(Request $request)
    {
        $column = $request->input('column');
        $values = $request->input('values', []);
        $items = $this->repository->whereNotIn($column, $values);
        return response()->json($items);
    }

    public function whereBetween(Request $request)
    {
        $column = $request->input('column');
        $range = $request->input('range', []);
        $items = $this->repository->whereBetween($column, $range);
        return response()->json($items);
    }

    public function withTrashed()
    {
        $items = $this->repository->withTrashed();
        return response()->json($items);
    }

    public function onlyTrashed()
    {
        $items = $this->repository->onlyTrashed();
        return response()->json($items);
    }

    public function withoutTrashed()
    {
        $items = $this->repository->withoutTrashed();
        return response()->json($items);
    }

    public function orderBy(Request $request)
    {
        $column = $request->input('column');
        $direction = $request->input('direction', 'asc');
        $items = $this->repository->orderBy($column, $direction);
        return response()->json($items);
    }

    public function groupBy(Request $request)
    {
        $column = $request->input('column');
        $items = $this->repository->groupBy($column);
        return response()->json($items);
    }
}
