<?php

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

    // Base Methods
}
