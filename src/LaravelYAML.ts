// export const laravelFolderStructure = `
// - CREATE_MULTIPLE_FILES(I{{tableNamePascalCaseSingular}}.ts --template /Templates/template.yaml)
// `;
// export const laravelFolderStructure = `
// - CREATE_MULTIPLE_FILES({{tableNamePascalCase}}.php --template /Templates/model-template.php)
// `;
// export const laravelFolderStructure = `
// app:
//   Http:
//     Controllers:
//       - CREATE_FILE(BaseController.php --template /Templates/backend/laravel/BaseController.txt)
//       - CREATE_MULTIPLE_FILES({{tableNamePascalCaseSingular}}Controller.php --template /Templates/backend/laravel/Controller.txt)
//       - CREATE_FILE(AuthController.php --conditions hasUsers=true)
//       - CREATE_FILE(AuthController.php --conditions [hasUsers=true, isMultiTenancyEnabled=true] --template /Templates/backend/laravel/AuthControllerMultiTenancy.txt)
// `;
export const laravelFolderStructure = `
app:
  Http:
    Controllers:
      - CREATE_FILE(BaseController.php --template /Templates/backend/laravel/BaseController.txt)
      - CREATE_MULTIPLE_FILES({{tableNamePascalCaseSingular}}Controller.php --template /Templates/backend/laravel/Controller.txt)
    Resources:
      - CREATE_MULTIPLE_FILES({{tableNamePascalCaseSingular}}Resource.php --template /Templates/backend/laravel/Resource.txt)
  Repositories:
    - CREATE_FILE(BaseRepository.php --template /Templates/backend/laravel/BaseRepository.txt)
    - CREATE_FILE(BaseInterface.php --template /Templates/backend/laravel/BaseInterface.txt)
    - CREATE_MULTIPLE_FILES({{tableNamePascalCaseSingular}}Repository.php --template /Templates/backend/laravel/Repository.txt)
  Services:
    - CREATE_FILE(BaseService.php --template /Templates/backend/laravel/BaseService.txt)
    - CREATE_MULTIPLE_FILES({{tableNamePascalCaseSingular}}Service.php --template /Templates/backend/laravel/Service.txt)
  Models:
    - CREATE_MULTIPLE_FILES({{tableNamePascalCaseSingular}}.php --template /Templates/backend/laravel/Model.txt)
  Providers:
    - CREATE_FILE(AppServiceProvider.php --template /Templates/backend/laravel/AppServiceProvider.txt)
routes:
  - CREATE_FILE(api.php --template /Templates/backend/laravel/api.txt)
  - CREATE_MULTIPLE_FILES({{tableNameKebabCasePlural}}.php --template /Templates/backend/laravel/Route.txt)
frontend:
  src:
    hooks:
      FOR_EACH_TABLE({{tableNameKebabCaseSingular}}):
        - CREATE_FILE(use{{tableNamePascalCaseSingular}}.ts --scoped --template /Templates/frontend/React-Hook.txt)
        - CREATE_FILE(api.ts --template /Templates/backend/laravel/api.txt)
        - CREATE_MULTIPLE_FILES(use{{tableNamePascalCaseSingular}}.tsx --template /Templates/frontend/React-Hook.txt)
    interfaces:
      - CREATE_MULTIPLE_FILES(I{{tableNamePascalCaseSingular}}.ts --template /Templates/frontend/TypeScript-Interface.txt)
`;
