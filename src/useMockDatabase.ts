import { IStructure } from '@/components/FileViewer.tsx';
import { create } from 'zustand';

interface IStore {
  userFiles: IStructure;
}

/*
 * Basic store without persisting
 */
export const useStore = create<IStore>()(() => ({
  userFiles: [
    {
      type: 'folder',
      name: 'Projects',
      children: [
        {
          type: 'file',
          name: 'LaravelFolderStructure.yaml',
          content: `
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
`,
        },
      ],
    },
    {
      type: 'file',
      name: 'base-methods-group.yaml',
      content: `
CRUD:
  methods:
    - create
Advanced Operations:
  methods:
    - chunk
`,
    },
    {
      type: 'folder',
      name: 'Templates',
      children: [
        {
          type: 'file',
          name: 'IUser.ts',
          content:
            'interface IUser { id: number; name: string; email: string; }',
        },
      ],
    },
    {
      type: 'folder',
      name: 'BaseMethods',
      children: [
        {
          type: 'file',
          name: 'create.yaml',
          content: `
methodName: create
route: Route::post('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, 'store'])->name('{{tableNameKebabCasePlural}}.store');
description: Create a new record
repositoryMethod: "{{methodName}}(array $data): Model"
repositoryContent: return $this->model->{{methodName}}($data);
serviceMethod: "{{methodName}}(array $data)"
serviceContent: |
    return $this->repository->{{methodName}}($data);
controllerMethod: store(Request $request)
controllerContent: |
    $item = $this->service->{{methodName}}($request->all());
    return response()->json($item, 201);
`,
        },
        {
          type: 'file',
          name: 'chunk.yaml',
          content: `
methodName: chunk
route: Route::post('{{tableNameKebabCasePlural}}/chunk', [{{tableNamePascalCase}}Controller::class, 'chunk'])->name('{{tableNameKebabCasePlural}}.chunk');
description: Chunk records for processing
repositoryMethod: "chunk(int $size, callable $callback): bool"
repositoryContent: return $this->model->chunk($size, $callback);
serviceMethod: "chunk(int $size, callable $callback): bool"
serviceContent: |
    return $this->repository->chunk($size, $callback);
controllerMethod: chunk(Request $request)
controllerContent: |
    $size = $request->input('size', 100);
    $callback = function ($items) {
        return response()->json($items);
    };
    $this->service->chunk($size, $callback);
`,
        },
      ],
    },
  ],
}));
