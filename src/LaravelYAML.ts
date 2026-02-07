// export const laravelFolderStructure = `
// - FILE_LOOP(I{{tableName.singular.pascalCase}}.ts --template /Templates/template.yaml)
// `;
// export const laravelFolderStructure = `
// - FILE_LOOP({{tableName.pascalCase}}.php --template /Templates/model-template.php)
// `;
// export const laravelFolderStructure = `
// app:
//   Http:
//     Controllers:
//       - CREATE_FILE(BaseController.php --template /Templates/backend/laravel/BaseController.txt)
//       - FILE_LOOP({{tableName.singular.pascalCase}}Controller.php --template /Templates/backend/laravel/Controller.txt)
//       - CREATE_FILE(AuthController.php --conditions hasUsers=true)
//       - CREATE_FILE(AuthController.php --conditions [hasUsers=true, isMultiTenancyEnabled=true] --template /Templates/backend/laravel/AuthControllerMultiTenancy.txt)
// `;
export const laravelFolderStructure = `
app:
  Http:
    Controllers:
      - CREATE_FILE(BaseController.php --template /Templates/backend/laravel/BaseController.txt)
      - FILE_LOOP({{tableName.singular.pascalCase}}Controller.php --template /Templates/backend/laravel/Controller.txt)
    Resources:
      - FILE_LOOP({{tableName.singular.pascalCase}}Resource.php --template /Templates/backend/laravel/Resource.txt)
  Repositories:
    - CREATE_FILE(BaseRepository.php --template /Templates/backend/laravel/BaseRepository.txt)
    - CREATE_FILE(BaseInterface.php --template /Templates/backend/laravel/BaseInterface.txt)
    - FILE_LOOP({{tableName.singular.pascalCase}}Repository.php --template /Templates/backend/laravel/Repository.txt)
  Services:
    - CREATE_FILE(BaseService.php --template /Templates/backend/laravel/BaseService.txt)
    - FILE_LOOP({{tableName.singular.pascalCase}}Service.php --template /Templates/backend/laravel/Service.txt)
  Models:
    - FILE_LOOP({{tableName.singular.pascalCase}}.php --template /Templates/backend/laravel/Model.txt)
  Providers:
    - CREATE_FILE(AppServiceProvider.php --template /Templates/backend/laravel/AppServiceProvider.txt)
routes:
  - CREATE_FILE(api.php --template /Templates/backend/laravel/api.txt)
  - FILE_LOOP({{tableName.plural.kebabCase}}.php --template /Templates/backend/laravel/Route.txt)
frontend:
  src:
    hooks:
      FOLDER_LOOP({{tableName.singular.kebabCase}}):
        - CREATE_FILE(use{{tableName.singular.pascalCase}}.ts --scoped --template /Templates/frontend/React-Hook.txt)
        - CREATE_FILE(api.ts --template /Templates/backend/laravel/api.txt)
        - FILE_LOOP(use{{tableName.singular.pascalCase}}.tsx --template /Templates/frontend/React-Hook.txt)
    interfaces:
      - FILE_LOOP(I{{tableName.singular.pascalCase}}.ts --template /Templates/frontend/TypeScript-Interface.txt)
`;
