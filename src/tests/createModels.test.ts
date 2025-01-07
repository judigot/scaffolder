import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema.ts';
import generateDomainCode from '@/utils/generateDomainCode.ts';
import { normalizeWhitespace } from '@/helpers/stringHelper.ts';
import { watermark } from '@/constants.ts';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
} from '@/json-schemas/index.ts';

const template = `
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

    {{hiddenColumns}}

    protected $fillable = [
        {{fillable}}
    ];
    {{relationships}}
}
    `;

describe('createModels', () => {
  const userPostOneToOneSchemaInfo = identifySchema(usersPostOneToOneSchema);
  const userPostsOneToManySchemaInfo = identifySchema(
    usersPostsOneToManySchema,
  );
  const POSSchemaInfo = identifySchema(POSSchema);

  it('should generate correct relationships for User model with one-to-one Post', () => {
    const userTableInfo = userPostOneToOneSchemaInfo.find(
      (table) => table.tableName === 'user',
    );

    if (userTableInfo == null) {
      throw new Error('User table not found in schema');
    }

    const userRelationships = generateDomainCode({
      schemaInfo: userPostOneToOneSchemaInfo,
      tableInfo: userTableInfo,
      tableName: 'user',
      codeToGenerate: 'modelContent',
    });

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
    protected $hidden = ['password'];
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
      .replace('{{ownerComment}}', watermark)
      .replace('{{modelImports}}', 'use App\\Models\\Post;')
      .replace('{{className}}', 'User')
      .replace('{{tableName}}', 'user')
      .replace('{{primaryKey}}', "protected $primaryKey = 'user_id';")
      .replace('{{hiddenColumns}}', "protected $hidden = ['password'];")
      .replace(
        '{{fillable}}',
        "'first_name',\n        'last_name',\n        'email',\n        'username',\n        'password'",
      )
      .replace('{{relationships}}', userRelationships.join('\n'));

    expect(normalizeWhitespace(generatedUserModel)).toEqual(
      normalizeWhitespace(expectedUserModel),
    );
  });

  it('should generate correct relationships for User model', () => {
    const userTableInfo = userPostsOneToManySchemaInfo.find(
      (table) => table.tableName === 'user',
    );

    if (userTableInfo == null) {
      throw new Error('User table not found in schema');
    }

    const userRelationships = generateDomainCode({
      schemaInfo: userPostsOneToManySchemaInfo,
      tableInfo: userTableInfo,
      tableName: 'user',
      codeToGenerate: 'modelContent',
    });

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
    protected $hidden = ['password'];
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
      .replace('{{ownerComment}}', watermark)
      .replace('{{modelImports}}', 'use App\\Models\\Post;')
      .replace('{{className}}', 'User')
      .replace('{{tableName}}', 'user')
      .replace('{{primaryKey}}', "protected $primaryKey = 'user_id';")
      .replace('{{hiddenColumns}}', "protected $hidden = ['password'];")
      .replace(
        '{{fillable}}',
        "'first_name',\n        'last_name',\n        'email',\n        'username',\n        'password'",
      )
      .replace('{{relationships}}', userRelationships.join('\n'));

    expect(normalizeWhitespace(generatedUserModel)).toEqual(
      normalizeWhitespace(expectedUserModel),
    );
  });

  it('should generate correct relationships for Post model', () => {
    const postTableInfo = userPostsOneToManySchemaInfo.find(
      (table) => table.tableName === 'post',
    );

    if (postTableInfo == null) {
      throw new Error('Post table not found in schema');
    }

    const postRelationships = generateDomainCode({
      schemaInfo: userPostsOneToManySchemaInfo,
      tableInfo: postTableInfo,
      tableName: 'post',
      codeToGenerate: 'modelContent',
    });

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

    protected $hidden = [];

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
      .replace('{{ownerComment}}', watermark)
      .replace('{{modelImports}}', 'use App\\Models\\User;')
      .replace('{{className}}', 'Post')
      .replace('{{tableName}}', 'post')
      .replace('{{primaryKey}}', "protected $primaryKey = 'post_id';")
      .replace('{{hiddenColumns}}', 'protected $hidden = [];')
      .replace(
        '{{fillable}}',
        "'user_id',\n        'title',\n        'content'",
      )
      .replace('{{relationships}}', postRelationships.join('\n'));

    expect(normalizeWhitespace(generatedPostModel)).toEqual(
      normalizeWhitespace(expectedPostModel),
    );
  });

  it('should generate correct relationships for Customer model', () => {
    const customerTableInfo = POSSchemaInfo.find(
      (table) => table.tableName === 'customer',
    );

    if (customerTableInfo == null) {
      throw new Error('Customer table not found in schema');
    }

    const customerRelationships = generateDomainCode({
      schemaInfo: POSSchemaInfo,
      tableInfo: customerTableInfo,
      tableName: 'customer',
      codeToGenerate: 'modelContent',
    });

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
    protected $hidden = [];
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
      .replace('{{ownerComment}}', watermark)
      .replace('{{modelImports}}', 'use App\\Models\\Order;')
      .replace('{{className}}', 'Customer')
      .replace('{{tableName}}', 'customer')
      .replace('{{primaryKey}}', "protected $primaryKey = 'customer_id';")
      .replace('{{hiddenColumns}}', 'protected $hidden = [];')
      .replace('{{fillable}}', "'name'")
      .replace('{{relationships}}', customerRelationships.join('\n'));

    expect(normalizeWhitespace(generatedCustomerModel)).toEqual(
      normalizeWhitespace(expectedCustomerModel),
    );
  });

  it('should generate correct relationships for Order model', () => {
    const orderTableInfo = POSSchemaInfo.find(
      (table) => table.tableName === 'order',
    );

    if (orderTableInfo == null) {
      throw new Error('Order table not found in schema');
    }

    const orderRelationships = generateDomainCode({
      schemaInfo: POSSchemaInfo,
      tableInfo: orderTableInfo,
      tableName: 'order',
      codeToGenerate: 'modelContent',
    });

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
    protected $hidden = [];
    protected $fillable = [
        'customer_id'
    ];
    public function order_products()
    {
        return $this->hasMany(OrderProduct::class, 'order_id');
    }
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
      .replace('{{ownerComment}}', watermark)
      .replace(
        '{{modelImports}}',
        'use App\\Models\\Customer;\nuse App\\Models\\OrderProduct;\nuse App\\Models\\Product;',
      )
      .replace('{{className}}', 'Order')
      .replace('{{tableName}}', 'order')
      .replace('{{primaryKey}}', "protected $primaryKey = 'order_id';")
      .replace('{{hiddenColumns}}', 'protected $hidden = [];')
      .replace('{{fillable}}', "'customer_id'")
      .replace('{{relationships}}', orderRelationships.join('\n'));

    expect(normalizeWhitespace(generatedOrderModel)).toEqual(
      normalizeWhitespace(expectedOrderModel),
    );
  });

  it('should generate correct relationships for OrderProduct model', () => {
    const orderProductTableInfo = POSSchemaInfo.find(
      (table) => table.tableName === 'order_product',
    );

    if (orderProductTableInfo == null) {
      throw new Error('OrderProduct table not found in schema');
    }

    const orderProductRelationships = generateDomainCode({
      schemaInfo: POSSchemaInfo,
      tableInfo: orderProductTableInfo,
      tableName: 'order_product',
      codeToGenerate: 'modelContent',
    });

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
    protected $hidden = [];
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
      .replace('{{ownerComment}}', watermark)
      .replace(
        '{{modelImports}}',
        'use App\\Models\\Order;\nuse App\\Models\\Product;',
      )
      .replace('{{className}}', 'OrderProduct')
      .replace('{{tableName}}', 'order_product')
      .replace('{{primaryKey}}', "protected $primaryKey = 'order_product_id';")
      .replace('{{hiddenColumns}}', 'protected $hidden = [];')
      .replace('{{fillable}}', "'order_id',\n        'product_id'")
      .replace('{{relationships}}', orderProductRelationships.join('\n'));

    expect(normalizeWhitespace(generatedOrderProductModel)).toEqual(
      normalizeWhitespace(expectedOrderProductModel),
    );
  });
});
