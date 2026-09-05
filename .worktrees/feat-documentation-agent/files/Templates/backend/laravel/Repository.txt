<?php

namespace App\Repositories;

{{modelImports}}
use Illuminate\Support\Collection;
use App\Models\{{tableNamePascalCase}};
use App\Repositories\BaseRepository;

class {{tableNamePascalCase}}Repository extends BaseRepository implements {{tableNamePascalCase}}Interface
{
    public function __construct({{tableNamePascalCase}} $model)
    {
        parent::__construct($model);
    }
{{modelSpecificMethods}}
}
