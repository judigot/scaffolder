<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{{tableNamePascalCase}}Controller;

// Custom routes for {{tableNamePascalCase}}

{{modelSpecificRoutes}}

// Base routes

{{baseRoutesForController}}

// Resource routes for {{tableNamePascalCase}}
Route::apiResource('{{tableNameKebabCasePlural}}', {{tableNamePascalCase}}Controller::class);
