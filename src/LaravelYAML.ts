export const laravelFolderStructure = `
app:
  Http:
    Controllers:
      - BaseController.php
      - CREATE_MULTIPLE_FILES(__tableNamePascalCase__Controller.php)
      - CREATE_FILE(AuthController.php --conditions hasUsers=true)
      - CREATE_FILE(AuthController.php --template AuthControllerMultiTenancy.php --conditions [hasUsers=true, isMultiTenancyEnabled=true])
    Resources:
      - CREATE_MULTIPLE_FILES(__tableNamePascalCase__Resource.php)
  Repositories:
    - BaseRepository.php
    - BaseInterface.php
    - CREATE_MULTIPLE_FILES(__tableNamePascalCase__Repository.php)
  Services:
    - BaseService.php
    - CREATE_MULTIPLE_FILES(__tableNamePascalCase__Service.php)
  Models:
    - CREATE_MULTIPLE_FILES(__tableNamePascalCase__.php)
  Providers:
    - CREATE_FILE(AppServiceProviderTemplate.php)
routes:
  - CREATE_FILE(api.php)
  - CREATE_MULTIPLE_FILES(__tableNameKebabCasePlural__.php)
frontend:
  src:
    hooks:
      CREATE_DYNAMIC_FOLDERS(__tableNameSnakeCaseSingular__):
        - CREATE_FILE(use__tableNamePascalCaseSingular__.ts)
    interfaces:
      - CREATE_MULTIPLE_FILES(I__tableNamePascalCaseSingular__.ts)
`;
