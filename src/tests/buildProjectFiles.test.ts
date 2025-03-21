import masterSchema from '@/schema-infos/masterSchema.ts';
import { buildProjectFiles } from '@/utils/buildProjectFiles.ts';
import filesToIStructure from '@/utils/filesToIStructure.ts';

describe('Build Project Files', () => {
  it('should build project files based on templates', () => {
    const expectation = `
    [
    {
        "type": "folder",
        "name": "app",
        "children": [
            {
                "type": "folder",
                "name": "Http",
                "children": [
                    {
                        "type": "folder",
                        "name": "Controllers",
                        "children": [
                            {
                                "type": "file",
                                "name": "BaseController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Routing\\Controller;\n\nabstract class BaseController extends Controller\n{\n    protected $service;\n\n    public function __construct($service)\n    {\n        $this->service = $service;\n    }\n\n    // CRUD\n    public function store(Request $request)\n    {\n        $item = $this->service->methodName($request->all());\n        return response()->json($item, 201);\n    }\n\n    // Advanced Operations\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "AuthController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\User;\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Auth;\nuse Illuminate\\Support\\Facades\\Hash;\nuse App\\Http\\Controllers\\BaseController;\n\nclass AuthController extends BaseController\n{\n    /**\n     * Register a new user.\n     */\n    public function register(Request $request)\n    {\n        $validatedData = $request->validate([\n            'first_name' => 'required|string|max:50',\n            'last_name' => 'required|string|max:50',\n            'email' => 'required|string|email|max:100|unique:user', // Make sure to match your table name here\n            'password' => 'required|string|min:8|confirmed',\n        ]);\n\n        // Create the user and hash the password\n        $user = User::create([\n            'first_name' => $validatedData['first_name'],\n            'last_name' => $validatedData['last_name'],\n            'email' => $validatedData['email'],\n            'password_hash' => Hash::make($validatedData['password']), // Hash the password correctly\n            'phone_number' => $request->phone_number,\n        ]);\n\n        // Load the user types\n        $user->load('userTypes');\n\n        // Generate the API token using Passport\n        $token = $user->createToken('Personal Access Token')->accessToken;\n\n        return response()->json(['token' => $token, 'user' => $user], 201);\n    }\n\n    /**\n     * Login user and return the token.\n     */\n    public function login(Request $request)\n    {\n        $credentials = $request->only('email', 'password');\n\n        // Attempt authentication\n        if (!Auth::attempt($credentials)) {\n            $user = User::where('email', $credentials['email'])->first();\n            // User does not exist\n            if (!$user) {\n                return response()->json([\n                    'status' => 404,\n                    'message' => 'User not found',\n                    'error_code' => 'USER_NOT_FOUND'\n                ], 404);\n            }\n\n            // Invalid password or credentials\n            return response()->json([\n                'status' => 401,\n                'message' => 'Invalid credentials',\n                'error_code' => 'INVALID_CREDENTIALS'\n            ], 401);\n        }\n\n        $user = Auth::user();\n        $user->load('userTypes');\n\n        $token = $user->createToken('Personal Access Token')->accessToken;\n        return response()->json([\n            'user' => $user,\n            'accessToken' => $token,\n        ], 200);\n    }\n\n\n    /**\n     * Logout user (revoke the token).\n     */\n    public function logout(Request $request)\n    {\n        // Revoke the user's token\n        $request->user()->token()->revoke();\n\n        return response()->json(['message' => 'Successfully logged out'], 200);\n    }\n\n    /**\n     * Get the authenticated user's details.\n     */\n    public function authorize(Request $request)\n    {\n        $user = $request->user();\n        $user->load('userTypes'); // Eager load user types\n\n        // Return the authenticated user's information\n        return response()->json($user);\n    }\n\n    /**\n     * Get the authenticated user's details.\n     */\n    public function user(Request $request)\n    {\n        $user = $request->user();\n        $user->load('userTypes'); // Eager load user types\n\n        // Return the authenticated user's information\n        return response()->json($user);\n    }\n\n    /**\n     * Super-Admin-specific access.\n     */\n    public function superadmin()\n    {\n        return response()->json(['message' => 'Super Admin Access']);\n    }\n\n    /**\n     * Admin-specific access.\n     */\n    public function admin()\n    {\n        return response()->json(['message' => 'Admin Access']);\n    }\n\n    /**\n     * User-specific access.\n     */\n    public function user()\n    {\n        return response()->json(['message' => 'User Access']);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "ProductController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\Product;\nuse App\\Repositories\\ProductInterface;\nuse App\\Services\\ProductService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass ProductController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(ProductInterface $productRepository, ProductService $productService)\n    {\n        parent::__construct($productService);\n        $this->repository = $productRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "CustomerController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\Customer;\nuse App\\Repositories\\CustomerInterface;\nuse App\\Services\\CustomerService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass CustomerController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(CustomerInterface $customerRepository, CustomerService $customerService)\n    {\n        parent::__construct($customerService);\n        $this->repository = $customerRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "OrderController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\Order;\nuse App\\Repositories\\OrderInterface;\nuse App\\Services\\OrderService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass OrderController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(OrderInterface $orderRepository, OrderService $orderService)\n    {\n        parent::__construct($orderService);\n        $this->repository = $orderRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "OrderProductController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\OrderProduct;\nuse App\\Repositories\\OrderProductInterface;\nuse App\\Services\\OrderProductService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass OrderProductController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(OrderProductInterface $order_productRepository, OrderProductService $order_productService)\n    {\n        parent::__construct($order_productService);\n        $this->repository = $order_productRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "UserController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\User;\nuse App\\Repositories\\UserInterface;\nuse App\\Services\\UserService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass UserController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(UserInterface $userRepository, UserService $userService)\n    {\n        parent::__construct($userService);\n        $this->repository = $userRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "ProfileController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\Profile;\nuse App\\Repositories\\ProfileInterface;\nuse App\\Services\\ProfileService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass ProfileController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(ProfileInterface $profileRepository, ProfileService $profileService)\n    {\n        parent::__construct($profileService);\n        $this->repository = $profileRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "PostController.php",
                                "content": "<?php\n\nnamespace App\\Http\\Controllers;\n\nuse App\\Models\\Posts;\nuse App\\Repositories\\PostsInterface;\nuse App\\Services\\PostsService;\nuse Illuminate\\Http\\Request;\nuse App\\Http\\Controllers\\BaseController;\n\nclass PostsController extends BaseController\n{\n    protected $repository;\n\n    public function __construct(PostsInterface $postsRepository, PostsService $postsService)\n    {\n        parent::__construct($postsService);\n        $this->repository = $postsRepository;\n    }\n\n    public function store(Request $request)\n    {\n        $item = $this->service->create($request->all());\n        return response()->json($item, 201);\n    }\n\n    public function chunk(Request $request)\n    {\n        $size = $request->input('size', 100);\n        $callback = function ($items) {\n            return response()->json($items);\n        };\n        $this->service->chunk($size, $callback);\n    }\n}"
                            }
                        ]
                    },
                    {
                        "type": "folder",
                        "name": "Resources",
                        "children": [
                            {
                                "type": "file",
                                "name": "ProductResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "CustomerResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "OrderResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "OrderProductResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "UserResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "ProfileResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            },
                            {
                                "type": "file",
                                "name": "PostResource.php",
                                "content": "<?php\n\nnamespace App\\Http\\Resources;\n\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\n\nclass classNameResource extends JsonResource\n{\n    /**\n     * Transform the resource into an array.\n     *\n     * @param \\Illuminate\\Http\\Request $request\n     * @return array\n     */\n    public function toArray($request)\n    {\n        return [\nattributes\n        ];\n    }\n}"
                            }
                        ]
                    }
                ]
            },
            {
                "type": "folder",
                "name": "Repositories",
                "children": [
                    {
                        "type": "file",
                        "name": "BaseRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Support\\Collection;\nuse App\\Repositories\\BaseInterface;\n\nabstract class BaseRepository implements BaseInterface\n{\n    protected Model $model;\n\n    public function __construct(Model $model)\n    {\n        $this->model = $model;\n    }\n\n    // Base Methods\n}"
                    },
                    {
                        "type": "file",
                        "name": "BaseInterface.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nuse Illuminate\\Support\\Collection;\nuse Illuminate\\Database\\Eloquent\\Model;\n\ninterface BaseInterface\n{\n        public function create(array $data): Model;\n        public function chunk(int $size, callable $callback): bool;\n}"
                    },
                    {
                        "type": "file",
                        "name": "ProductRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\Product;\nuse App\\Repositories\\BaseRepository;\n\nclass ProductRepository extends BaseRepository implements ProductInterface\n{\n    public function __construct(Product $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    },
                    {
                        "type": "file",
                        "name": "CustomerRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\Customer;\nuse App\\Repositories\\BaseRepository;\n\nclass CustomerRepository extends BaseRepository implements CustomerInterface\n{\n    public function __construct(Customer $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    },
                    {
                        "type": "file",
                        "name": "OrderRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\Order;\nuse App\\Repositories\\BaseRepository;\n\nclass OrderRepository extends BaseRepository implements OrderInterface\n{\n    public function __construct(Order $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    },
                    {
                        "type": "file",
                        "name": "OrderProductRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\OrderProduct;\nuse App\\Repositories\\BaseRepository;\n\nclass OrderProductRepository extends BaseRepository implements OrderProductInterface\n{\n    public function __construct(OrderProduct $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    },
                    {
                        "type": "file",
                        "name": "UserRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\User;\nuse App\\Repositories\\BaseRepository;\n\nclass UserRepository extends BaseRepository implements UserInterface\n{\n    public function __construct(User $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    },
                    {
                        "type": "file",
                        "name": "ProfileRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\Profile;\nuse App\\Repositories\\BaseRepository;\n\nclass ProfileRepository extends BaseRepository implements ProfileInterface\n{\n    public function __construct(Profile $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    },
                    {
                        "type": "file",
                        "name": "PostRepository.php",
                        "content": "<?php\n\nnamespace App\\Repositories;\n\nmodelImports\nuse Illuminate\\Support\\Collection;\nuse App\\Models\\Posts;\nuse App\\Repositories\\BaseRepository;\n\nclass PostsRepository extends BaseRepository implements PostsInterface\n{\n    public function __construct(Posts $model)\n    {\n        parent::__construct($model);\n    }\nmodelSpecificMethods\n}"
                    }
                ]
            },
            {
                "type": "folder",
                "name": "Services",
                "children": [
                    {
                        "type": "file",
                        "name": "BaseService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Repositories\\BaseRepository;\nuse Illuminate\\Support\\Collection;\nuse Illuminate\\Database\\Eloquent\\Model;\n\nabstract class BaseService\n{\n    protected BaseRepository $repository;\n\n    public function __construct(BaseRepository $repository)\n    {\n        $this->repository = $repository;\n    }\n\n    // Base Service Methods\n}"
                    },
                    {
                        "type": "file",
                        "name": "ProductService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\Product;\nuse App\\Repositories\\ProductRepository;\n\nclass ProductService extends BaseService\n{\n    public function __construct(ProductRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    },
                    {
                        "type": "file",
                        "name": "CustomerService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\Customer;\nuse App\\Repositories\\CustomerRepository;\n\nclass CustomerService extends BaseService\n{\n    public function __construct(CustomerRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    },
                    {
                        "type": "file",
                        "name": "OrderService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\Order;\nuse App\\Repositories\\OrderRepository;\n\nclass OrderService extends BaseService\n{\n    public function __construct(OrderRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    },
                    {
                        "type": "file",
                        "name": "OrderProductService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\OrderProduct;\nuse App\\Repositories\\OrderProductRepository;\n\nclass OrderProductService extends BaseService\n{\n    public function __construct(OrderProductRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    },
                    {
                        "type": "file",
                        "name": "UserService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\User;\nuse App\\Repositories\\UserRepository;\n\nclass UserService extends BaseService\n{\n    public function __construct(UserRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    },
                    {
                        "type": "file",
                        "name": "ProfileService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\Profile;\nuse App\\Repositories\\ProfileRepository;\n\nclass ProfileService extends BaseService\n{\n    public function __construct(ProfileRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    },
                    {
                        "type": "file",
                        "name": "PostService.php",
                        "content": "<?php\n\nnamespace App\\Services;\n\nuse App\\Models\\Posts;\nuse App\\Repositories\\PostsRepository;\n\nclass PostsService extends BaseService\n{\n    public function __construct(PostsRepository $repository)\n    {\n        parent::__construct($repository);\n    }\n}"
                    }
                ]
            },
            {
                "type": "folder",
                "name": "Models",
                "children": [
                    {
                        "type": "file",
                        "name": "Product.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\OrderProduct;\nuse App\\Models\\Order;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass Product extends Model\n{\n    use HasFactory;\n\n    protected $table = 'product';\n\n    protected $primaryKey = 'product_id';\n\n    protected $hidden = [\n        \n    ];\n\n    protected $fillable = [\n        'product_name'\n    ];\n\n    \n\n    public function order_products() {\n        return $this->hasMany(OrderProduct::class);\n    }\n\n    public function orders() {\n        return $this->belongsToMany(Order::class);\n    }\n\n    \n\n}"
                    },
                    {
                        "type": "file",
                        "name": "Customer.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\Order;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass Customer extends Model\n{\n    use HasFactory;\n\n    protected $table = 'customer';\n\n    protected $primaryKey = 'customer_id';\n\n    protected $hidden = [\n        \n    ];\n\n    protected $fillable = [\n        'name'\n    ];\n\n    \n\n    public function orders() {\n        return $this->hasMany(Order::class);\n    }\n\n    \n\n    \n\n}"
                    },
                    {
                        "type": "file",
                        "name": "Order.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\OrderProduct;\nuse App\\Models\\Customer;\nuse App\\Models\\Product;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass Order extends Model\n{\n    use HasFactory;\n\n    protected $table = 'order';\n\n    protected $primaryKey = 'order_id';\n\n    protected $hidden = [\n        \n    ];\n\n    protected $fillable = [\n        'customer_id'\n    ];\n\n    \n\n    public function order_products() {\n        return $this->hasMany(OrderProduct::class);\n    }\n\n    public function products() {\n        return $this->belongsToMany(Product::class);\n    }\n\n    public function customer() {\n        return $this->belongsTo(Customer::class);\n    }\n\n}"
                    },
                    {
                        "type": "file",
                        "name": "OrderProduct.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\Order;\nuse App\\Models\\Product;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass OrderProduct extends Model\n{\n    use HasFactory;\n\n    protected $table = 'order_product';\n\n    protected $primaryKey = 'order_product_id';\n\n    protected $hidden = [\n        \n    ];\n\n    protected $fillable = [\n        'order_id',\n        'product_id'\n    ];\n\n    \n\n    \n\n    \n\n    public function order() {\n        return $this->belongsTo(Order::class);\n    }\n\npublic function product() {\n        return $this->belongsTo(Product::class);\n    }\n\n}"
                    },
                    {
                        "type": "file",
                        "name": "User.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\Profile;\nuse App\\Models\\Post;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass User extends Model\n{\n    use HasFactory;\n\n    protected $table = 'user';\n\n    protected $primaryKey = 'user_id';\n\n    protected $hidden = [\n        'password'\n    ];\n\n    protected $fillable = [\n        'first_name',\n        'last_name',\n        'email',\n        'username',\n        'password'\n    ];\n\n    public function profile() {\n    return $this->hasOne(Profile::class);\n    }\n\n    public function posts() {\n        return $this->hasMany(Post::class);\n    }\n\n    \n\n    \n\n}"
                    },
                    {
                        "type": "file",
                        "name": "Profile.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\User;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass Profile extends Model\n{\n    use HasFactory;\n\n    protected $table = 'profile';\n\n    protected $primaryKey = 'profile_id';\n\n    protected $hidden = [\n        \n    ];\n\n    protected $fillable = [\n        'user_id',\n        'bio'\n    ];\n\n    \n\n    \n\n    \n\n    public function user() {\n        return $this->belongsTo(User::class);\n    }\n\n}"
                    },
                    {
                        "type": "file",
                        "name": "Post.php",
                        "content": "<?php\n\nnamespace App\\Models;\n\nuse App\\Models\\User;\nuse Illuminate\\Database\\Eloquent\\Model;\nuse Illuminate\\Database\\Eloquent\\Factories\\HasFactory;\n\nclass Posts extends Model\n{\n    use HasFactory;\n\n    protected $table = 'posts';\n\n    protected $primaryKey = 'post_id';\n\n    protected $hidden = [\n        \n    ];\n\n    protected $fillable = [\n        'user_id',\n        'title'\n    ];\n\n    \n\n    \n\n    \n\n    public function user() {\n        return $this->belongsTo(User::class);\n    }\n\n}"
                    }
                ]
            },
            {
                "type": "folder",
                "name": "Providers",
                "children": [
                    {
                        "type": "file",
                        "name": "AppServiceProvider.php",
                        "content": "<?php\n\n// Please add template content"
                    }
                ]
            }
        ]
    },
    {
        "type": "folder",
        "name": "routes",
        "children": [
            {
                "type": "file",
                "name": "api.php",
                "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
            },
            {
                "type": "file",
                "name": "products.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\ProductController;\n\n// Custom routes for Product\n\n\n\n// Base routes\n\n\n\n// Resource routes for Product\nRoute::apiResource('products', ProductController::class);"
            },
            {
                "type": "file",
                "name": "customers.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\CustomerController;\n\n// Custom routes for Customer\n\n\n\n// Base routes\n\n\n\n// Resource routes for Customer\nRoute::apiResource('customers', CustomerController::class);"
            },
            {
                "type": "file",
                "name": "orders.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\OrderController;\n\n// Custom routes for Order\n\n\n\n// Base routes\n\n\n\n// Resource routes for Order\nRoute::apiResource('orders', OrderController::class);"
            },
            {
                "type": "file",
                "name": "order-products.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\OrderProductController;\n\n// Custom routes for OrderProduct\n\n\n\n// Base routes\n\n\n\n// Resource routes for OrderProduct\nRoute::apiResource('order-products', OrderProductController::class);"
            },
            {
                "type": "file",
                "name": "users.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\UserController;\n\n// Custom routes for User\n\n\n\n// Base routes\n\n\n\n// Resource routes for User\nRoute::apiResource('users', UserController::class);"
            },
            {
                "type": "file",
                "name": "profiles.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\ProfileController;\n\n// Custom routes for Profile\n\n\n\n// Base routes\n\n\n\n// Resource routes for Profile\nRoute::apiResource('profiles', ProfileController::class);"
            },
            {
                "type": "file",
                "name": "posts.php",
                "content": "<?php\n\nuse Illuminate\\Support\\Facades\\Route;\nuse App\\Http\\Controllers\\PostsController;\n\n// Custom routes for Posts\n\n\n\n// Base routes\n\n\n\n// Resource routes for Posts\nRoute::apiResource('posts', PostsController::class);"
            }
        ]
    },
    {
        "type": "folder",
        "name": "frontend",
        "children": [
            {
                "type": "folder",
                "name": "src",
                "children": [
                    {
                        "type": "folder",
                        "name": "hooks",
                        "children": [
                            {
                                "type": "folder",
                                "name": "product",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "useProduct.ts",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            },
                            {
                                "type": "folder",
                                "name": "customer",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "useCustomer.ts",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            },
                            {
                                "type": "folder",
                                "name": "order",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "useOrder.ts",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            },
                            {
                                "type": "folder",
                                "name": "order-product",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.ts",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            },
                            {
                                "type": "folder",
                                "name": "user",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "useUser.ts",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            },
                            {
                                "type": "folder",
                                "name": "profile",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "useProfile.ts",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            },
                            {
                                "type": "folder",
                                "name": "post",
                                "children": [
                                    {
                                        "type": "file",
                                        "name": "usePost.ts",
                                        "content": "// Posts hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "api.ts",
                                        "content": "<?php\n\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\Route;\n\nRoute::middleware('api')->group(function () {\n    require __DIR__ . '/products.php';\n    require __DIR__ . '/customers.php';\n    require __DIR__ . '/orders.php';\n    require __DIR__ . '/order_products.php';\n    require __DIR__ . '/users.php';\n    require __DIR__ . '/profiles.php';\n    require __DIR__ . '/posts.php';\n});"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProduct.tsx",
                                        "content": "// Product hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useCustomer.tsx",
                                        "content": "// Customer hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrder.tsx",
                                        "content": "// Order hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useOrderProduct.tsx",
                                        "content": "// OrderProduct hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useUser.tsx",
                                        "content": "// User hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "useProfile.tsx",
                                        "content": "// Profile hook"
                                    },
                                    {
                                        "type": "file",
                                        "name": "usePost.tsx",
                                        "content": "// Posts hook"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "folder",
                        "name": "interfaces",
                        "children": [
                            {
                                "type": "file",
                                "name": "IProduct.ts",
                                "content": "export interface IProduct {\n  product_id: number;\n  product_name: string;\n}\n\nexport function isIProduct(data: unknown): data is IProduct {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'product_id' in data &&\n    'product_name' in data &&\n    typeof data.product_id === 'number' &&\n    typeof data.product_name === 'string'\n  );\n}\n\nexport function isIProductArray(data: unknown): data is IProduct[] {\n  return Array.isArray(data) && data.every(isIProduct);\n}"
                            },
                            {
                                "type": "file",
                                "name": "ICustomer.ts",
                                "content": "export interface ICustomer {\n  customer_id: number;\n  name: string;\n}\n\nexport function isICustomer(data: unknown): data is ICustomer {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'customer_id' in data &&\n    'name' in data &&\n    typeof data.customer_id === 'number' &&\n    typeof data.name === 'string'\n  );\n}\n\nexport function isICustomerArray(data: unknown): data is ICustomer[] {\n  return Array.isArray(data) && data.every(isICustomer);\n}"
                            },
                            {
                                "type": "file",
                                "name": "IOrder.ts",
                                "content": "export interface IOrder {\n  order_id: number;\n  customer_id: number;\n}\n\nexport function isIOrder(data: unknown): data is IOrder {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'order_id' in data &&\n    'customer_id' in data &&\n    typeof data.order_id === 'number' &&\n    typeof data.customer_id === 'number'\n  );\n}\n\nexport function isIOrderArray(data: unknown): data is IOrder[] {\n  return Array.isArray(data) && data.every(isIOrder);\n}"
                            },
                            {
                                "type": "file",
                                "name": "IOrderProduct.ts",
                                "content": "export interface IOrderProduct {\n  order_product_id: number;\n  order_id: number;\n  product_id: number;\n}\n\nexport function isIOrderProduct(data: unknown): data is IOrderProduct {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'order_product_id' in data &&\n    'order_id' in data &&\n    'product_id' in data &&\n    typeof data.order_product_id === 'number' &&\n    typeof data.order_id === 'number' &&\n    typeof data.product_id === 'number'\n  );\n}\n\nexport function isIOrderProductArray(data: unknown): data is IOrderProduct[] {\n  return Array.isArray(data) && data.every(isIOrderProduct);\n}"
                            },
                            {
                                "type": "file",
                                "name": "IUser.ts",
                                "content": "export interface IUser {\n  user_id: number;\n  first_name: string;\n  last_name: string;\n  email: string;\n  username: string;\n  password: string;\n  created_at: Date;\n  updated_at: Date;\n}\n\nexport function isIUser(data: unknown): data is IUser {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'user_id' in data &&\n    'first_name' in data &&\n    'last_name' in data &&\n    'email' in data &&\n    'username' in data &&\n    'password' in data &&\n    'created_at' in data &&\n    'updated_at' in data &&\n    typeof data.user_id === 'number' &&\n    typeof data.first_name === 'string' &&\n    typeof data.last_name === 'string' &&\n    typeof data.email === 'string' &&\n    typeof data.username === 'string' &&\n    typeof data.password === 'string' &&\n    typeof data.created_at === 'string' &&\n    typeof data.updated_at === 'string'\n  );\n}\n\nexport function isIUserArray(data: unknown): data is IUser[] {\n  return Array.isArray(data) && data.every(isIUser);\n}"
                            },
                            {
                                "type": "file",
                                "name": "IProfile.ts",
                                "content": "export interface IProfile {\n  profile_id: number;\n  user_id: number;\n  bio: string;\n  created_at: Date;\n  updated_at: Date;\n}\n\nexport function isIProfile(data: unknown): data is IProfile {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'profile_id' in data &&\n    'user_id' in data &&\n    'bio' in data &&\n    'created_at' in data &&\n    'updated_at' in data &&\n    typeof data.profile_id === 'number' &&\n    typeof data.user_id === 'number' &&\n    typeof data.bio === 'string' &&\n    typeof data.created_at === 'string' &&\n    typeof data.updated_at === 'string'\n  );\n}\n\nexport function isIProfileArray(data: unknown): data is IProfile[] {\n  return Array.isArray(data) && data.every(isIProfile);\n}"
                            },
                            {
                                "type": "file",
                                "name": "IPost.ts",
                                "content": "export interface IPosts {\n  post_id: number;\n  user_id: number;\n  title: string;\n  content?: string;\n  created_at: Date;\n  updated_at: Date;\n}\n\nexport function isIPosts(data: unknown): data is IPosts {\n  return (\n    data !== null &&\n    typeof data === 'object' &&\n    'post_id' in data &&\n    'user_id' in data &&\n    'title' in data &&\n    'content' in data &&\n    'created_at' in data &&\n    'updated_at' in data &&\n    typeof data.post_id === 'number' &&\n    typeof data.user_id === 'number' &&\n    typeof data.title === 'string' &&\n    typeof data.content === 'string' &&\n    typeof data.created_at === 'string' &&\n    typeof data.updated_at === 'string'\n  );\n}\n\nexport function isIPostsArray(data: unknown): data is IPosts[] {\n  return Array.isArray(data) && data.every(isIPosts);\n}"
                            }
                        ]
                    }
                ]
            }
        ]
    }
]
    `;
    const userFiles = filesToIStructure('src/files');
    const result = buildProjectFiles(
      '/Projects/Laravel.yaml',
      userFiles,
      masterSchema,
    );
    const clean = (str: string) =>
      str
        .replace(/\\\\/g, '\\') // replace double backslash with single backslash
        .replace(/\\n/g, '') // remove literal "\n"
        .replace(/\s+/g, ''); // remove all whitespace

    expect(clean(JSON.stringify(result))).toEqual(clean(expectation));
  });
});
