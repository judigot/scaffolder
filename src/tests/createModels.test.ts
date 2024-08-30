import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import identifySchema from '@/utils/identifySchema';
import { createRelationships } from '@/utils/createModels';
import { normalizeWhitespace } from '@/helpers/toPascalCase';
import { userPostOneToOneSchema } from '@/json-schemas/userPostOneToOneSchema';
import { userPostsOneToManySchema } from '@/json-schemas/userPostsOneToManySchema';
import { POSSchema } from '@/json-schemas/POSSchema';

const loadTemplate = (framework: string) => {
  const templatePath = path.resolve(
    __dirname,
    `../templates/backend/${framework}/model.txt`,
  );
  return fs.readFileSync(templatePath, 'utf8');
};

describe('createModels', () => {
  const userPostOneToOneSchemaInfo = identifySchema(userPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(userPostsOneToManySchema);
  const POSSchemaInfo = identifySchema(POSSchema);

  it('should generate correct relationships for User model with one-to-one Post using model.txt template', () => {
    const framework = 'laravel';
    const template = loadTemplate(framework);

    const userRelationships = createRelationships(
      'user',
      [],
      ['post'],
      [],
      userPostOneToOneSchemaInfo,
    );

    const expectedUserModel = normalizeWhitespace(`
      <?php
      namespace App\\Models;
      use App\\Models\\Post;
      use Illuminate\\Database\\Eloquent\\Model;
      use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
      class User extends Model
      {
          use HasFactory;
          protected $table = 'user';
          protected $primaryKey = 'user_id';
          protected $fillable = [
              'first_name',
              'last_name',
              'email',
              'username',
              'password'
          ];
          public function post()
          {
              return $this->hasOne(Post::class, 'user_id');
          }
      }
    `);

    const generatedUserModel = template
      .replace('{{modelImports}}', 'use App\\Models\\Post;')
      .replace('{{className}}', 'User')
      .replace('{{tableName}}', 'user')
      .replace('{{primaryKey}}', "protected $primaryKey = 'user_id';")
      .replace(
        '{{fillable}}',
        "'first_name',\n        'last_name',\n        'email',\n        'username',\n        'password'",
      )
      .replace('{{relationships}}', userRelationships);

    expect(normalizeWhitespace(generatedUserModel)).toEqual(
      normalizeWhitespace(expectedUserModel),
    );
  });

  it('should generate correct relationships for User model using model.txt template', () => {
    const framework = 'laravel';
    const template = loadTemplate(framework);

    const userRelationships = createRelationships(
      'user',
      [],
      [],
      [],
      userPostsOneToManySchemaInfo,
    );

    const expectedUserModel = normalizeWhitespace(`
      <?php
      namespace App\\Models;
      use App\\Models\\Post;
      use Illuminate\\Database\\Eloquent\\Model;
      use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
      class User extends Model
      {
          use HasFactory;
          protected $table = 'user';
          protected $primaryKey = 'user_id';
          protected $fillable = [
              'first_name',
              'last_name',
              'email',
              'username',
              'password'
          ];
          public function posts()
          {
              return $this->hasMany(Post::class, 'user_id');
          }
      }
    `);

    const generatedUserModel = template
      .replace('{{modelImports}}', 'use App\\Models\\Post;')
      .replace('{{className}}', 'User')
      .replace('{{tableName}}', 'user')
      .replace('{{primaryKey}}', "protected $primaryKey = 'user_id';")
      .replace(
        '{{fillable}}',
        "'first_name',\n        'last_name',\n        'email',\n        'username',\n        'password'",
      )
      .replace('{{relationships}}', userRelationships);

    expect(normalizeWhitespace(generatedUserModel)).toEqual(
      normalizeWhitespace(expectedUserModel),
    );
  });

  it('should generate correct relationships for Post model using model.txt template', () => {
    const framework = 'laravel';
    const template = loadTemplate(framework);

    const postRelationships = createRelationships(
      'post',
      ['user_id'],
      [],
      [],
      userPostsOneToManySchemaInfo,
    );

    const expectedPostModel = normalizeWhitespace(`
      <?php
      namespace App\\Models;
      use App\\Models\\User;
      use Illuminate\\Database\\Eloquent\\Model;
      use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
      class Post extends Model
      {
          use HasFactory;
          protected $table = 'post';
          protected $primaryKey = 'post_id';
          protected $fillable = [
              'user_id',
              'title',
              'content'
          ];
          public function user()
          {
              return $this->belongsTo(User::class, 'user_id');
          }
      }
    `);

    const generatedPostModel = template
      .replace('{{modelImports}}', 'use App\\Models\\User;')
      .replace('{{className}}', 'Post')
      .replace('{{tableName}}', 'post')
      .replace('{{primaryKey}}', "protected $primaryKey = 'post_id';")
      .replace(
        '{{fillable}}',
        "'user_id',\n        'title',\n        'content'",
      )
      .replace('{{relationships}}', postRelationships);

    expect(normalizeWhitespace(generatedPostModel)).toEqual(
      normalizeWhitespace(expectedPostModel),
    );
  });

  it('should generate correct relationships for Customer model using model.txt template', () => {
    const framework = 'laravel';
    const template = loadTemplate(framework);

    const customerRelationships = createRelationships(
      'customer',
      [],
      [],
      [],
      POSSchemaInfo,
    );

    const expectedCustomerModel = normalizeWhitespace(`
      <?php
      namespace App\\Models;
      use App\\Models\\Order;
      use Illuminate\\Database\\Eloquent\\Model;
      use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
      class Customer extends Model
      {
          use HasFactory;
          protected $table = 'customer';
          protected $primaryKey = 'customer_id';
          protected $fillable = [
              'name'
          ];
          public function orders()
          {
              return $this->hasMany(Order::class, 'customer_id');
          }
      }
    `);

    const generatedCustomerModel = template
      .replace('{{modelImports}}', 'use App\\Models\\Order;')
      .replace('{{className}}', 'Customer')
      .replace('{{tableName}}', 'customer')
      .replace('{{primaryKey}}', "protected $primaryKey = 'customer_id';")
      .replace('{{fillable}}', "'name'")
      .replace('{{relationships}}', customerRelationships);

    expect(normalizeWhitespace(generatedCustomerModel)).toEqual(
      normalizeWhitespace(expectedCustomerModel),
    );
  });

  it('should generate correct relationships for Order model using model.txt template', () => {
    const framework = 'laravel';
    const template = loadTemplate(framework);

    const orderRelationships = createRelationships(
      'order',
      ['customer_id'],
      [],
      ['product'],
      POSSchemaInfo,
    );

    const expectedOrderModel = normalizeWhitespace(`
      <?php
      namespace App\\Models;
      use App\\Models\\Customer;
      use App\\Models\\OrderProduct;
      use App\\Models\\Product;
      use Illuminate\\Database\\Eloquent\\Model;
      use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
      class Order extends Model
      {
          use HasFactory;
          protected $table = 'order';
          protected $primaryKey = 'order_id';
          protected $fillable = [
              'customer_id'
          ];
          public function customer()
          {
              return $this->belongsTo(Customer::class, 'customer_id');
          }
          public function products()
          {
              return $this->belongsToMany(Product::class, 'order_product', 'order_id', 'product_id');
          }
      }
    `);

    const generatedOrderModel = template
      .replace(
        '{{modelImports}}',
        'use App\\Models\\Customer;\nuse App\\Models\\OrderProduct;\nuse App\\Models\\Product;',
      )
      .replace('{{className}}', 'Order')
      .replace('{{tableName}}', 'order')
      .replace('{{primaryKey}}', "protected $primaryKey = 'order_id';")
      .replace('{{fillable}}', "'customer_id'")
      .replace('{{relationships}}', orderRelationships);

    expect(normalizeWhitespace(generatedOrderModel)).toEqual(
      normalizeWhitespace(expectedOrderModel),
    );
  });

  it('should generate correct relationships for OrderProduct model using model.txt template', () => {
    const framework = 'laravel';
    const template = loadTemplate(framework);

    const orderProductRelationships = createRelationships(
      'order_product',
      ['order_id', 'product_id'],
      [],
      [],
      POSSchemaInfo,
    );

    const expectedOrderProductModel = normalizeWhitespace(`
      <?php
      namespace App\\Models;
      use App\\Models\\Order;
      use App\\Models\\Product;
      use Illuminate\\Database\\Eloquent\\Model;
      use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
      class OrderProduct extends Model
      {
          use HasFactory;
          protected $table = 'order_product';
          protected $primaryKey = 'order_product_id';
          protected $fillable = [
              'order_id',
              'product_id'
          ];
          public function order()
          {
              return $this->belongsTo(Order::class, 'order_id');
          }
          public function product()
          {
              return $this->belongsTo(Product::class, 'product_id');
          }
      }
    `);

    const generatedOrderProductModel = template
      .replace(
        '{{modelImports}}',
        'use App\\Models\\Order;\nuse App\\Models\\Product;',
      )
      .replace('{{className}}', 'OrderProduct')
      .replace('{{tableName}}', 'order_product')
      .replace('{{primaryKey}}', "protected $primaryKey = 'order_product_id';")
      .replace('{{fillable}}', "'order_id',\n        'product_id'")
      .replace('{{relationships}}', orderProductRelationships);

    expect(normalizeWhitespace(generatedOrderProductModel)).toEqual(
      normalizeWhitespace(expectedOrderProductModel),
    );
  });
});
