import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'destroy',
  route: `Route::delete('{{tableNameKebabCasePlural}}/{id}', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.{{methodName}}');`,
  description: 'Delete a specific record by ID',
  repositoryMethod: `{{methodName}}(int $id): bool`,
  repositoryContent: `
        $record = $this->model->find($id);
        return $record ? $record->{{methodName}}() : false;
      `,
  serviceMethod: `{{methodName}}($id)`,
  serviceContent: `
      
        return $this->repository->{{methodName}}($id);
      
    `,
  controllerMethod: `{{methodName}}($id)`,
  controllerContent: `
      
        $deleted = $this->service->{{methodName}}($id);
        return $deleted ? response()->json(['message' => 'Resource deleted']) : response()->json(['message' => 'Resource not found'], 404);
      
    `,
} satisfies IMethod;
