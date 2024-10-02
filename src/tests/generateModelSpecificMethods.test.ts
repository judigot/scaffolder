import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { normalizeWhitespace } from '@/helpers/toPascalCase';
import { POSSchema } from '@/json-schemas/POSSchema';
import { usersPostOneToOneSchema } from '@/json-schemas/usersPostOneToOneSchema';
import { usersPostsOneToManySchema } from '@/json-schemas/usersPostsOneToManySchema';

describe('generateModelSpecificMethods', () => {
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);

  describe('POS', () => {
    it('should generate correct methods for repository', () => {
      const orderSchema = POSSchemaInfo.find((info) => info.table === 'order');
      if (!orderSchema) throw new Error("Schema for 'order' not found");

      const methods = generateModelSpecificMethods({
        targetTable: orderSchema.table,
        schemaInfo: POSSchemaInfo,
        fileToGenerate: 'repository',
      });

      const expectedMethod = `
    /**
     * Get the related OrderProducts.
     *
     * @param int $order_id
     * @return ?Collection
     */
    public function getOrderProducts(int $order_id, ?string $column = null, string $direction = 'asc'): ?Collection{
        
      $orderProductModel = new OrderProduct();
      $query = $this->model->find($order_id)?->orderProducts();
      $column = $column ?? $orderProductModel->getKeyName();
      $query->orderBy($column, $direction);
      return $query ? $query->get() : null;
      
    }`;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct methods for interface', () => {
      const orderProductSchema = POSSchemaInfo.find(
        (info) => info.table === 'order_product',
      );
      if (!orderProductSchema) {
        throw new Error("Schema for 'order_product' not found");
      }

      const methods = generateModelSpecificMethods({
        targetTable: orderProductSchema.table,
        schemaInfo: POSSchemaInfo,
        fileToGenerate: 'interface',
      });

      const expectedMethod = `
    /**
     * Find OrderProduct by order_id.
     *
     * @param int $order_id
     * @return ?OrderProduct
     */
    public function findByOrderId(int $order_id, ?string $column = null, string $direction = 'asc'): ?OrderProduct;
  
    /**
     * Find OrderProduct by product_id.
     *
     * @param int $product_id
     * @return ?OrderProduct
     */
    public function findByProductId(int $product_id, ?string $column = null, string $direction = 'asc'): ?OrderProduct;
    `;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct methods for controllerMethod', () => {
      const orderSchema = POSSchemaInfo.find((info) => info.table === 'order');
      if (!orderSchema) throw new Error("Schema for 'order' not found");

      const methods = generateModelSpecificMethods({
        targetTable: orderSchema.table,
        schemaInfo: POSSchemaInfo,
        fileToGenerate: 'controllerMethod',
      });

      const expectedMethod = `
    /**
     * Get all OrderProducts related to the given Order.
     *
     * @param int $order_id
     * 
     */
    public function getOrderProducts(Request $request, int $order_id){
        
      // Extract optional URL parameters
      $column = $request->input('column', null); // Default to null if no column is provided
      $direction = $request->input('direction', 'asc'); // Default to 'asc' if no direction is provided

      // Fetch the order_products from the repository
      $order_products = $this->repository->getOrderProducts($order_id, $column, $direction);
      return response()->json($order_products);
    
    }`;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct routes', () => {
      const orderSchema = POSSchemaInfo.find((info) => info.table === 'order');
      if (!orderSchema) throw new Error("Schema for 'order' not found");

      const methods = generateModelSpecificMethods({
        targetTable: orderSchema.table,
        schemaInfo: POSSchemaInfo,
        fileToGenerate: 'routes',
      });

      const expectedRoute = `
Route::get('orders/{id}/products', [OrderController::class, 'getOrderProducts']);
`;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedRoute),
      );
    });
  });

  describe('User Posts', () => {
    it('should generate correct methods for repository', () => {
      const userSchema = userPostsOneToManySchemaInfo.find(
        (info) => info.table === 'user',
      );
      if (!userSchema) throw new Error("Schema for 'user' not found");

      const methods = generateModelSpecificMethods({
        targetTable: userSchema.table,
        schemaInfo: userPostsOneToManySchemaInfo,
        fileToGenerate: 'repository',
      });

      const expectedMethod = `
    /**
     * Get the related Posts.
     *
     * @param int $user_id
     * @return ?Collection
     */
    public function getPosts(int $user_id, ?string $column = null, string $direction = 'asc'): ?Collection{
        
      $postModel = new Post();
      $query = $this->model->find($user_id)?->posts();
      $column = $column ?? $postModel->getKeyName();
      $query->orderBy($column, $direction);
      return $query ? $query->get() : null;
      
    }`;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct methods for interface', () => {
      const postSchema = userPostsOneToManySchemaInfo.find(
        (info) => info.table === 'post',
      );
      if (!postSchema) throw new Error("Schema for 'post' not found");

      const methods = generateModelSpecificMethods({
        targetTable: postSchema.table,
        schemaInfo: userPostsOneToManySchemaInfo,
        fileToGenerate: 'interface',
      });

      const expectedMethod = `
    /**
     * Find Post by user_id.
     *
     * @param int $user_id
     * @return ?Post
     */
    public function findByUserId(int $user_id, ?string $column = null, string $direction = 'asc'): ?Post;
    `;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct methods for controllerMethod', () => {
      const userSchema = userPostsOneToManySchemaInfo.find(
        (info) => info.table === 'user',
      );
      if (!userSchema) throw new Error("Schema for 'user' not found");

      const methods = generateModelSpecificMethods({
        targetTable: userSchema.table,
        schemaInfo: userPostsOneToManySchemaInfo,
        fileToGenerate: 'controllerMethod',
      });

      const expectedMethod = `
    /**
     * Get all Posts related to the given User.
     *
     * @param int $user_id
     * 
     */
    public function getPosts(Request $request, int $user_id){
        
      // Extract optional URL parameters
      $column = $request->input('column', null); // Default to null if no column is provided
      $direction = $request->input('direction', 'asc'); // Default to 'asc' if no direction is provided

      // Fetch the posts from the repository
      $posts = $this->repository->getPosts($user_id, $column, $direction);
      return response()->json($posts);
    
    }`;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct routes', () => {
      const userSchema = userPostsOneToManySchemaInfo.find(
        (info) => info.table === 'user',
      );
      if (!userSchema) throw new Error("Schema for 'user' not found");

      const methods = generateModelSpecificMethods({
        targetTable: userSchema.table,
        schemaInfo: userPostsOneToManySchemaInfo,
        fileToGenerate: 'routes',
      });

      const expectedRoute = `
Route::get('users/{id}/posts', [UserController::class, 'getPosts']);
`;

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedRoute),
      );
    });
  });

  describe('User Post One-to-One', () => {
    it('should generate correct methods for repository', () => {
      const userSchema = userPostOneToOneSchemaInfo.find(
        (info) => info.table === 'user',
      );
      if (!userSchema) throw new Error("Schema for 'user' not found");

      const methods = generateModelSpecificMethods({
        targetTable: userSchema.table,
        schemaInfo: userPostOneToOneSchemaInfo,
        fileToGenerate: 'repository',
      });

      const expectedMethod = normalizeWhitespace(`
      /**
       * Get the related Post.
       *
       * @param int $user_id
       * @return ?Post
       */
      public function getPost(int $user_id, ?string $column = null, string $direction = 'asc'): ?Post{
        return $this->model->find($user_id)?->post;
      }`);

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct methods for interface', () => {
      const postSchema = userPostOneToOneSchemaInfo.find(
        (info) => info.table === 'post',
      );
      if (!postSchema) throw new Error("Schema for 'post' not found");

      const methods = generateModelSpecificMethods({
        targetTable: postSchema.table,
        schemaInfo: userPostOneToOneSchemaInfo,
        fileToGenerate: 'interface',
      });

      const expectedMethod = normalizeWhitespace(`
      /**
       * Find Post by user_id.
       *
       * @param int $user_id
       * @return ?Post
       */
      public function findByUserId(int $user_id, ?string $column = null, string $direction = 'asc'): ?Post;
      `);

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct methods for controllerMethod', () => {
      const userSchema = userPostOneToOneSchemaInfo.find(
        (info) => info.table === 'user',
      );
      if (!userSchema) throw new Error("Schema for 'user' not found");

      const methods = generateModelSpecificMethods({
        targetTable: userSchema.table,
        schemaInfo: userPostOneToOneSchemaInfo,
        fileToGenerate: 'controllerMethod',
      });

      const expectedMethod = normalizeWhitespace(`
      /**
       * Get the related Post related to the given User.
       *
       * @param int $user_id
       * 
       */
      public function getPost(Request $request, int $user_id){
          
        // Fetch the post from the repository
        $post = $this->repository->getPost($user_id);
        return response()->json($post);
      
      }
      `);

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedMethod),
      );
    });

    it('should generate correct routes', () => {
      const userSchema = userPostOneToOneSchemaInfo.find(
        (info) => info.table === 'user',
      );
      if (!userSchema) throw new Error("Schema for 'user' not found");

      const methods = generateModelSpecificMethods({
        targetTable: userSchema.table,
        schemaInfo: userPostOneToOneSchemaInfo,
        fileToGenerate: 'routes',
      });

      const expectedRoute = normalizeWhitespace(`
        Route::get('users/{id}/post', [UserController::class, 'getPost']);
      `);

      expect(normalizeWhitespace(methods)).toContain(
        normalizeWhitespace(expectedRoute),
      );
    });
  });
});
