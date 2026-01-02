<?php

namespace App\Services;

use App\Repositories\BaseRepository;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Model;

abstract class BaseService
{
    protected BaseRepository $repository;

    public function __construct(BaseRepository $repository)
    {
        $this->repository = $repository;
    }

    // Base Service Methods
}
