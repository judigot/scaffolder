import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'restore',
  route: `Route::put('{{tableNameKebabCasePlural}}/{id}/restore', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.restore');`,
  description: 'Restore a soft-deleted record by ID',
  repositoryMethod: `{{methodName}}(int $id): bool`,
  repositoryContent: `
      $record = $this->model->onlyTrashed()->find($id);
      return $record ? $record->restore() : false;
      `,
  serviceMethod: `{{methodName}}(int $id): bool`,
  serviceContent: `
      
      return $this->repository->{{methodName}}($id);
      
    `,
  controllerMethod: `{{methodName}}($id)`,
  controllerContent: `
      
      $restored = $this->service->{{methodName}}($id);
      return $restored
            ? response()->json(['message' => 'Resource restored'])
            : response()->json(['message' => 'Resource not found'], 404);
      
    `,
} satisfies IMethod;
