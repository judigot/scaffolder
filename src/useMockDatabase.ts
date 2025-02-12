import { IStructure } from '@/components/FileViewer.tsx';
import { laravelFolderStructure } from '@/LaravelYAML.ts';
import { create } from 'zustand';

interface IStore {
  userFiles: IStructure;
}

/*
 * Basic store without persisting
 */
export const useStore = create<IStore>()(() => ({
  userFiles: [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'file',
          name: 'LaravelFolderStructure.yaml',
          content: laravelFolderStructure,
        },
      ],
    },
    {
      type: 'file',
      name: 'base-methods-group.yaml',
      content: `
CRUD:
  methods:
    - create
Advanced Operations:
  methods:
    - chunk
`,
    },
    {
      type: 'folder',
      name: 'Templates',
      children: [
        {
          type: 'file',
          name: 'BaseController.php',
          content: `
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
    [[LOOP_BASE_METHODS_CONTROLLER
    public function {{controllerMethod}}
    {
    {{controllerContent}}
    }
    ]]
}
`,
        },
        {
          type: 'file',
          name: 'model-template.php',
          content: `
<?php

namespace App\\Models;

{{modelImports}}
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class {{className}} extends Model
{
    use HasFactory;

    protected $table = '{{tableName}}';

    {{primaryKey}}

    protected $hidden = [{{hiddenColumns}}];

    protected $fillable = [
        {{fillable}}
    ];

    {{domainMethods}}
}
`,
        },
        {
          type: 'file',
          name: 'resource-template.php',
          content: `
<?php

namespace App\\Http\\Resources;

use Illuminate\\Http\\Resources\\Json\\JsonResource;

class {{className}}Resource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \\Illuminate\\Http\\Request $request
     * @return array
     */
    public function toArray($request)
    {
        return [
{{attributes}}
        ];
    }
}
`,
        },
        {
          type: 'file',
          name: 'repository-template.php',
          content: `
<?php

namespace App\\Repositories;

{{modelImports}}
use Illuminate\\Support\\Collection;
use App\\Models\\{{tableNamePascalCase}};
use App\\Repositories\\BaseRepository;

class {{tableNamePascalCase}}Repository extends BaseRepository implements {{tableNamePascalCase}}Interface
{
    public function __construct({{tableNamePascalCase}} $model)
    {
        parent::__construct($model);
    }
{{modelSpecificMethods}}
}
`,
        },
        {
          type: 'file',
          name: 'service-template.php',
          content: `
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
`,
        },
        {
          type: 'file',
          name: 'controller-template.php',
          content: `
<?php

namespace App\\Http\\Controllers;

use App\\Models\\{{tableNamePascalCase}};
use App\\Repositories\\{{tableNamePascalCase}}Interface;
use App\\Services\\{{tableNamePascalCase}}Service;
use Illuminate\\Http\\Request;
use App\\Http\\Controllers\\BaseController;

class {{tableNamePascalCase}}Controller extends BaseController
{
    protected $repository;

    public function __construct({{tableNamePascalCase}}Interface \${{tableName}}Repository, {{tableNamePascalCase}}Service \${{tableName}}Service)
    {
        parent::__construct(\${{tableName}}Service);
        $this->repository = \${{tableName}}Repository;
    }

{{controllerMethods}}
}`,
        },
        {
          type: 'file',
          name: 'api.php',
          content: `
<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;

Route::middleware('api')->group(function () {
    [[LOOP_TABLES require __DIR__ . '/$_tableNamePlural_$.php';]]
});`,
        },
        {
          type: 'file',
          name: 'table-routes.php',
          content: `
<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\{{tableNamePascalCase}}Controller;

// Custom routes for {{tableNamePascalCase}}

{{modelSpecificRoutes}}

// Base routes

{{baseRoutesForController}}

// Resource routes for {{tableNamePascalCase}}
Route::apiResource('{{tableNameKebabCasePlural}}', {{tableNamePascalCase}}Controller::class);
`,
        },
        {
          type: 'file',
          name: 'AuthController.php',
          content: `
<?php

namespace App\\Http\\Controllers;

use App\\Models\\User;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;
use Illuminate\\Support\\Facades\\Hash;
use App\\Http\\Controllers\\BaseController;

class AuthController extends BaseController
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'email' => 'required|string|email|max:100|unique:user', // Make sure to match your table name here
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Create the user and hash the password
        $user = User::create([
            'first_name' => $validatedData['first_name'],
            'last_name' => $validatedData['last_name'],
            'email' => $validatedData['email'],
            'password_hash' => Hash::make($validatedData['password']), // Hash the password correctly
            'phone_number' => $request->phone_number,
        ]);

        // Load the user types
        $user->load('userTypes');

        // Generate the API token using Passport
        $token = $user->createToken('Personal Access Token')->accessToken;

        return response()->json(['token' => $token, 'user' => $user], 201);
    }

    /**
     * Login user and return the token.
     */
    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        // Attempt authentication
        if (!Auth::attempt($credentials)) {
            $user = User::where('email', $credentials['email'])->first();
            // User does not exist
            if (!$user) {
                return response()->json([
                    'status' => 404,
                    'message' => 'User not found',
                    'error_code' => 'USER_NOT_FOUND'
                ], 404);
            }

            // Invalid password or credentials
            return response()->json([
                'status' => 401,
                'message' => 'Invalid credentials',
                'error_code' => 'INVALID_CREDENTIALS'
            ], 401);
        }

        $user = Auth::user();
        $user->load('userTypes');

        $token = $user->createToken('Personal Access Token')->accessToken;
        return response()->json([
            'user' => $user,
            'accessToken' => $token,
        ], 200);
    }


    /**
     * Logout user (revoke the token).
     */
    public function logout(Request $request)
    {
        // Revoke the user's token
        $request->user()->token()->revoke();

        return response()->json(['message' => 'Successfully logged out'], 200);
    }

    /**
     * Get the authenticated user's details.
     */
    public function authorize(Request $request)
    {
        $user = $request->user();
        $user->load('userTypes'); // Eager load user types

        // Return the authenticated user's information
        return response()->json($user);
    }

    /**
     * Get the authenticated user's details.
     */
    public function user(Request $request)
    {
        $user = $request->user();
        $user->load('userTypes'); // Eager load user types

        // Return the authenticated user's information
        return response()->json($user);
    }

    /**
     * Super-Admin-specific access.
     */
    public function superadmin()
    {
        return response()->json(['message' => 'Super Admin Access']);
    }

    /**
     * Admin-specific access.
     */
    public function admin()
    {
        return response()->json(['message' => 'Admin Access']);
    }

    /**
     * User-specific access.
     */
    public function user()
    {
        return response()->json(['message' => 'User Access']);
    }
}
`,
        },
      ],
    },
    {
      type: 'folder',
      name: 'BaseMethods',
      children: [
        {
          type: 'file',
          name: 'create.yaml',
          content: `
methodName: create
route: Route::post('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, 'store'])->name('{{tableNameKebabCasePlural}}.store');
description: Create a new record
repositoryMethod: "{{methodName}}(array $data): Model"
repositoryContent: return $this->model->{{methodName}}(array $data);
serviceMethod: "{{methodName}}(array $data)"
serviceContent: |
    return $this->repository->{{methodName}}(array $data);
controllerMethod: store(Request $request)
controllerContent: |
    $item = $this->service->{{methodName}}($request->all());
    return response()->json($item, 201);
`,
        },
        {
          type: 'file',
          name: 'chunk.yaml',
          content: `
methodName: chunk
route: Route::post('{{tableNameKebabCasePlural}}/chunk', [{{tableNamePascalCase}}Controller::class, 'chunk'])->name('{{tableNameKebabCasePlural}}.chunk');
description: Chunk records for processing
repositoryMethod: "chunk(int $size, callable $callback): bool"
repositoryContent: return $this->model->chunk($size, $callback);
serviceMethod: "chunk(int $size, callable $callback): bool"
serviceContent: |
    return $this->repository->chunk($size, $callback);
controllerMethod: chunk(Request $request)
controllerContent: |
        $size = $request->input('size', 100);
    $callback = function ($items) {
        return response()->json($items);
    };
    $this->service->chunk($size, $callback);
`,
        },
      ],
    },
  ],
}));
