## Schema Info:

    ```jsonc
    /* prettier-ignore */ [ { "tableName": "product", "requiredColumns": [ "product_id", "product_name" ], "columnsInfo": [ { "column_name": "product_id", "data_type": "number", "is_nullable": "NO", "column_default": "AUTO_INCREMENT", "primary_key": true }, { "column_name": "product_name", "data_type": "string", "is_nullable": "NO" } ], "childTables": [ "order_product" ], "hasMany": [ "order_product" ], "belongsToMany": [ "order" ], "pivotRelationships": [ { "relatedTable": "order", "pivotTable": "order_product" } ] }, { "tableName": "customer", "requiredColumns": [ "customer_id", "name" ], "columnsInfo": [ { "column_name": "customer_id", "data_type": "number", "is_nullable": "NO", "column_default": "AUTO_INCREMENT", "primary_key": true }, { "column_name": "name", "data_type": "string", "is_nullable": "NO" } ], "childTables": [ "order" ], "hasMany": [ "order" ] }, { "tableName": "order", "requiredColumns": [ "order_id", "customer_id" ], "columnsInfo": [ { "column_name": "order_id", "data_type": "number", "is_nullable": "NO", "column_default": "AUTO_INCREMENT", "primary_key": true }, { "column_name": "customer_id", "data_type": "number", "is_nullable": "NO", "foreign_key": { "foreign_table_name": "customer", "foreign_column_name": "customer_id" } } ], "foreignTables": [ "customer" ], "foreignKeys": [ "customer_id" ], "childTables": [ "order_product" ], "hasMany": [ "order_product" ], "belongsTo": [ "customer" ], "belongsToMany": [ "product" ], "pivotRelationships": [ { "relatedTable": "product", "pivotTable": "order_product" } ] }, { "tableName": "order_product", "requiredColumns": [ "order_product_id", "order_id", "product_id" ], "columnsInfo": [ { "column_name": "order_product_id", "data_type": "number", "is_nullable": "NO", "column_default": "AUTO_INCREMENT", "primary_key": true }, { "column_name": "order_id", "data_type": "number", "is_nullable": "NO", "foreign_key": { "foreign_table_name": "order", "foreign_column_name": "order_id" } }, { "column_name": "product_id", "data_type": "number", "is_nullable": "NO", "foreign_key": { "foreign_table_name": "product", "foreign_column_name": "product_id" } } ], "isPivot": true, "foreignTables": [ "order", "product" ], "foreignKeys": [ "order_id", "product_id" ], "belongsTo": [ "order", "product" ] } ]
    ```

## Project Information:

- Can have static files or template files. Template files like routes.php where the content has placeholders for the schemaInfo to loop the tables.

  Static file:

  ```ts
  import { defineConfig } from "vite";
  import laravel from "laravel-vite-plugin";

  export default defineConfig({
    plugins: [
      laravel({
        input: ["resources/css/app.css", "resources/js/app.js"],
        refresh: true,
      }),
    ],
  });
  ```

  Template file:

  ```txt
    <?php

    use Illuminate\\Http\\Request;
    use Illuminate\\Support\\Facades\\Route;

    Route::middleware('api')->group(function () {
    @
    LOOP_TABLES(){
        require __DIR__ . '/{{tableNamePlural}}.php';
    }
    @
    });
  ```

-

## Laravel Project Structure

```yaml
app:
  Http:
    Controllers:
      - BaseController.php
      - FILE_LOOP(__tableNamePascalCase__Controller.php)
      - CREATE_FILE(AuthController.php --conditions hasUsers=true)
      - CREATE_FILE(AuthController.php --template AuthControllerMultiTenancy.php --conditions [hasUsers=true, isMultiTenancyEnabled=true])
    Resources:
      - FILE_LOOP(__tableNamePascalCase__Resource.php)
  Repositories:
    - BaseRepository.php
    - BaseInterface.php
    - FILE_LOOP(__tableNamePascalCase__Repository.php)
  Services:
    - BaseService.php
    - FILE_LOOP(__tableNamePascalCase__Service.php)
  Models:
    - FILE_LOOP(__tableNamePascalCase__.php)
  Providers:
    - CREATE_FILE(AppServiceProviderTemplate.php)
routes:
  - CREATE_FILE(api.php)
  - FILE_LOOP(__tableNameKebabCasePlural__.php)
frontend:
  src:
    hooks:
      FOR_EACH_TABLE(__tableNameSnakeCaseSingular__):
        - CREATE_FILE(use__tableNamePascalCaseSingular__.ts)
    interfaces:
      - FILE_LOOP(I__tableNamePascalCaseSingular__.ts)
```

## Frontend Project Structure

A project using dynamic folder structure using MULTIPLE_FOLDERS() generator.

```yaml
src:
  hooks:
    FOR_EACH_TABLE(__tableNameSnakeCaseSingular__):
      - CREATE_FILE(use__tableNamePascalCaseSingular__.ts)
  interfaces:
    - FILE_LOOP(I__tableNamePascalCaseSingular__.ts)
```

## Conditional Files and Folders

Conditional folder:

```yaml
Laravel:
  app:
    Http:
      Controllers:
        Auth(--condition hasUsers=true):
          - CREATE_FILE(AuthController.php --conditions hasUsers=true)
          - CREATE_FILE(AuthController.php --template AuthControllerMultiTenancy.php --conditions [hasUsers=true, isMultiTenancyEnabled=true])
```

Conditional file:

```yaml
Laravel:
  app:
    Http:
      Controllers:
        - CREATE_FILE(AuthController.php --conditions hasUsers=true)
        - CREATE_FILE(AuthController.php --template AuthControllerMultiTenancy.php --conditions [hasUsers=true, isMultiTenancyEnabled=true])
```

## Project Conditions

Projects can use config conditions:

A project that supports user authentication:

```ts
{
  users: {
    hasUsers: true;
  }
}
```
