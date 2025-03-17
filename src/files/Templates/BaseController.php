<?php

namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use Illuminate\\Routing\\Controller;

abstract class BaseController extends Controller
{
    protected $service;

    public function __construct($service)
    {
        $this->service = $service;
    }
    [[LOOP_BASE_METHODS
    public function {{controllerMethod}}
    {
    {{controllerContent}}
    }
    ]]
}
