<?php

namespace App\\Services;

use App\\Models\\{{className}};
use App\\Repositories\\{{className}}Repository;

class {{className}}Service extends BaseService
{
    public function __construct({{className}}Repository $repository)
    {
        parent::__construct($repository);
    }
}
