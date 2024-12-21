import { describe, it, expect } from 'vitest';
import identifySchema from '@/utils/identifySchema.ts';
import { createRelationships } from '@/frameworks/backend/laravel/createModels.ts';
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

  it('should generate correct relationships for User model with one-to-one Post using model.txt template', () => {
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
      .replace('{{relationships}}', userRelationships);

    expect(normalizeWhitespace(generatedUserModel)).toEqual(
      normalizeWhitespace(expectedUserModel),
    );
  });

  it('should generate correct relationships for User model using model.txt template', () => {
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
      .replace('{{relationships}}', userRelationships);

    expect(normalizeWhitespace(generatedUserModel)).toEqual(
      normalizeWhitespace(expectedUserModel),
    );
  });

  it('should generate correct relationships for Post model using model.txt template', () => {
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
      .replace('{{relationships}}', postRelationships);

    expect(normalizeWhitespace(generatedPostModel)).toEqual(
      normalizeWhitespace(expectedPostModel),
    );
  });

  it('should generate correct relationships for Customer model using model.txt template', () => {
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
      .replace('{{relationships}}', customerRelationships);

    expect(normalizeWhitespace(generatedCustomerModel)).toEqual(
      normalizeWhitespace(expectedCustomerModel),
    );
  });

  it('should generate correct relationships for Order model using model.txt template', () => {
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
    protected $hidden = [];
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
      .replace('{{relationships}}', orderRelationships);

    expect(normalizeWhitespace(generatedOrderModel)).toEqual(
      normalizeWhitespace(expectedOrderModel),
    );
  });

  it('should generate correct relationships for OrderProduct model using model.txt template', () => {
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
      .replace('{{relationships}}', orderProductRelationships);

    expect(normalizeWhitespace(generatedOrderProductModel)).toEqual(
      normalizeWhitespace(expectedOrderProductModel),
    );
  });
});
