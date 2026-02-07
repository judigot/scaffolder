import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'softDelete',
  route: `Route::delete('{{tableName.plural.kebabCase}}/{id}/soft-delete', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.soft-delete');`,
  description: 'Soft delete a specific record by ID',
  repositoryMethod: `{{methodName}}(int $id): bool`,
  repositoryContent: `
      $record = $this->model->find($id);
      return $record ? $record->delete() : false;
      `,
  serviceMethod: `{{methodName}}(int $id): bool`,
  serviceContent: `
      return $this->repository->{{methodName}}($id);
      `,
  controllerMethod: `{{methodName}}($id)`,
  controllerContent: `
      $softDeleted = $this->service->{{methodName}}($id);
      return $softDeleted
            ? response()->json(['message' => 'Resource soft-deleted'])
            : response()->json(['message' => 'Resource not found'], 404);
      `,
} satisfies IMethod;
