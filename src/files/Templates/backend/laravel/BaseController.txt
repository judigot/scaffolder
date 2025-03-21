<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

abstract class BaseController extends Controller
{
    protected $service;

    public function __construct($service)
    {
        $this->service = $service;
    }

    // CRUD
[[ITERATE(/BaseMethods/laravel/crud) --template="    public function {{controllerMethod}}
    {
{{controllerContent}}    }"]]

    // Advanced Operations
[[ITERATE(/BaseMethods/laravel/advanced-operations) --template="    public function {{controllerMethod}}
    {
{{controllerContent}}    }"]]
}
