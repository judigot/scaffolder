<?php

namespace App\Services;

use App\Models\{{tableNamePascalCase}};
use App\Repositories\{{tableNamePascalCase}}Repository;

class {{tableNamePascalCase}}Service extends BaseService
{
    public function __construct({{tableNamePascalCase}}Repository $repository)
    {
        parent::__construct($repository);
    }
}
