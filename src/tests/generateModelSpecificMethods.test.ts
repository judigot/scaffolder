import { describe, it, expect } from 'vitest';
import JSON5 from 'json5';
import { ISchemaInfo } from '@/interfaces/interfaces';
import identifySchema from '@/utils/identifySchema';
import { generateModelSpecificMethods } from '@/utils/generateModelSpecificMethods';
import { normalizeWhitespace } from '@/helpers/toPascalCase';

describe('generateModelSpecificMethods', () => {
  const schemaInput = JSON5.stringify({
    product: [
      {
        product_id: 1,
        product_name: 'Water',
      },
      {
        product_id: 2,
        product_name: 'Yogurt',
      },
    ],
    customer: [
      {
        customer_id: 1,
        name: 'John Doe',
      },
      {
        customer_id: 2,
        name: 'Jane Doe',
      },
    ],
    order: [
      {
        order_id: 1,
        customer_id: 1,
      },
      {
        order_id: 2,
        customer_id: 1,
      },
      {
        order_id: 3,
        customer_id: 2,
      },
    ],
    order_product: [
      {
        order_product_id: 1,
        order_id: 1,
        product_id: 1,
      },
      {
        order_product_id: 2,
        order_id: 1,
        product_id: 2,
      },
      {
        order_product_id: 3,
        order_id: 2,
        product_id: 2,
      },
    ],
    user: [
      {
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        password:
          '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
        created_at: '2023-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
      {
        user_id: 2,
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        username: 'janedoe',
        password:
          '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
        created_at: '2024-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
    ],
    post: [
      {
        post_id: 1,
        user_id: 1,
        title: "John's Post",
        content: 'Lorem ipsum',
        created_at: '2023-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
      {
        post_id: 2,
        user_id: 1,
        title: "John's 2nd Post",
        content: 'Lorem ipsum',
        created_at: '2023-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
      {
        post_id: 3,
        user_id: 2,
        title: "Jane's Post",
        content: null,
        created_at: '2024-06-18T10:17:19.846Z',
        updated_at: '2024-06-18T10:17:19.846Z',
      },
    ],
  });

  const formData: Record<string, Record<string, unknown>[]> =
    JSON5.parse(schemaInput);
  const schemaInfo: ISchemaInfo[] = identifySchema(formData);

  describe('POS', () => {
    it('should generate correct methods for repository', () => {
      const orderSchema = schemaInfo.find((info) => info.table === 'order');
      if (orderSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: orderSchema.table,
          schemaInfo,
          fileToGenerate: 'repository',
        });

        const expectedMethod = `
    /**
     * Get the related Products.
     *
     * @param int $order_id
     * @return ?Collection
     */
    public function getProducts(int $order_id): ?Collection {
        return $this->model->find($order_id)?->products;
    }`;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedMethod),
        );
      }
    });

    it('should generate correct methods for interface', () => {
      const orderProductSchema = schemaInfo.find(
        (info) => info.table === 'order_product',
      );
      if (orderProductSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: orderProductSchema.table,
          schemaInfo,
          fileToGenerate: 'interface',
        });

        const expectedMethod = `
    /**
     * Find OrderProduct by order_id.
     *
     * @param int $order_id
     * @return ?OrderProduct
     */
    public function findByOrderId(int $order_id): ?OrderProduct;
    `;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedMethod),
        );
      }
    });

    it('should generate correct methods for controllerMethod', () => {
      const orderSchema = schemaInfo.find((info) => info.table === 'order');
      if (orderSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: orderSchema.table,
          schemaInfo,
          fileToGenerate: 'controllerMethod',
        });

        const expectedMethod = `
    /**
     * Get all Products related to the given Order.
     *
     * @param int $order_id
     * 
     */
    public function getProducts(int $order_id) {

        $products = $this->repository->getProducts($order_id);
        return response()->json($products);
    }`;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedMethod),
        );
      }
    });

    it('should generate correct routes', () => {
      const orderSchema = schemaInfo.find((info) => info.table === 'order');
      if (orderSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: orderSchema.table,
          schemaInfo,
          fileToGenerate: 'routes',
        });

        const expectedRoute = `
Route::get('orders/{id}/products', [OrderController::class, 'getProducts']);
`;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedRoute),
        );
      }
    });
  });

  describe('User Posts', () => {
    it('should generate correct methods for repository', () => {
      const userSchema = schemaInfo.find((info) => info.table === 'user');
      if (userSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: userSchema.table,
          schemaInfo,
          fileToGenerate: 'repository',
        });

        const expectedMethod = `
    /**
     * Get the related Posts.
     *
     * @param int $user_id
     * @return ?Collection
     */
    public function getPosts(int $user_id): ?Collection {
        return $this->model->find($user_id)?->posts;
    }`;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedMethod),
        );
      }
    });

    it('should generate correct methods for interface', () => {
      const postSchema = schemaInfo.find((info) => info.table === 'post');
      if (postSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: postSchema.table,
          schemaInfo,
          fileToGenerate: 'interface',
        });

        const expectedMethod = `
    /**
     * Find Post by user_id.
     *
     * @param int $user_id
     * @return ?Post
     */
    public function findByUserId(int $user_id): ?Post;
    `;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedMethod),
        );
      }
    });

    it('should generate correct methods for controllerMethod', () => {
      const userSchema = schemaInfo.find((info) => info.table === 'user');
      if (userSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: userSchema.table,
          schemaInfo,
          fileToGenerate: 'controllerMethod',
        });

        const expectedMethod = `
    /**
     * Get all Posts related to the given User.
     *
     * @param int $user_id
     * 
     */
    public function getPosts(int $user_id) {

        $posts = $this->repository->getPosts($user_id);
        return response()->json($posts);
    }`;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedMethod),
        );
      }
    });

    it('should generate correct routes', () => {
      const userSchema = schemaInfo.find((info) => info.table === 'user');
      if (userSchema) {
        const methods = generateModelSpecificMethods({
          targetTable: userSchema.table,
          schemaInfo,
          fileToGenerate: 'routes',
        });

        const expectedRoute = `
Route::get('users/{id}/posts', [UserController::class, 'getPosts']);
`;

        expect(normalizeWhitespace(methods)).toContain(
          normalizeWhitespace(expectedRoute),
        );
      }
    });
  });
});
