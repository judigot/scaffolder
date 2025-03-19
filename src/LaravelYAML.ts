// export const laravelFolderStructure = `
// - CREATE_MULTIPLE_FILES(I$_tableNamePascalCaseSingular_$.ts --template template.yaml)
// `;
// export const laravelFolderStructure = `
// - CREATE_MULTIPLE_FILES($_tableNamePascalCase_$.php --template model-template.php)
// `;
export const laravelFolderStructure = `
app:
  Http:
    Controllers:
      - BaseController.php
      - CREATE_MULTIPLE_FILES($_tableNamePascalCase_$Controller.php --template controller-template.php)
      - CREATE_FILE(AuthController.php --conditions hasUsers=true)
      - CREATE_FILE(AuthController.php --template AuthControllerMultiTenancy.php --conditions [hasUsers=true, isMultiTenancyEnabled=true])
    Resources:
      - CREATE_MULTIPLE_FILES($_tableNamePascalCase_$Resource.php --template resource-template.php)
  Repositories:
    - BaseRepository.php
    - BaseInterface.php
    - CREATE_MULTIPLE_FILES($_tableNamePascalCase_$Repository.php --template repository-template.php)
  Services:
    - BaseService.php
    - CREATE_MULTIPLE_FILES($_tableNamePascalCase_$Service.php --template service-template.php)
  Models:
    - CREATE_MULTIPLE_FILES($_tableNamePascalCase_$.php --template model-template.php)
  Providers:
    - CREATE_FILE(AppServiceProviderTemplate.php)
routes:
  - CREATE_FILE(api.php)
  - CREATE_MULTIPLE_FILES($_tableNameKebabCasePlural_$.php --template table-routes.php)
frontend:
  src:
    hooks:
      CREATE_DYNAMIC_FOLDERS($_tableNameSnakeCaseSingular_$):
        - CREATE_FILE(use$_tableNamePascalCaseSingular_$.ts)
    interfaces:
      - CREATE_MULTIPLE_FILES(I$_tableNamePascalCaseSingular_$.ts --template typescript-interface-template.txt)
`;
