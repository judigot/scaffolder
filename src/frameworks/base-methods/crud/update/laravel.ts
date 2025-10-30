import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'update',
  route: `Route::put('{{tableNameKebabCasePlural}}/{id}', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.{{methodName}}');`,
  description: 'Update a specific record by ID',
  repositoryMethod: `{{methodName}}(int $id, array $data): bool`,
  repositoryContent: `
        $record = $this->model->find($id);
        return $record ? $record->{{methodName}}($data) : false;
      `,
  serviceMethod: `{{methodName}}($id, array $data)`,
  serviceContent: `
        return $this->repository->{{methodName}}($id, $data);
      `,
  controllerMethod: `{{methodName}}(Request $request, $id)`,
  controllerContent: `
        $updated = $this->service->{{methodName}}($id, $request->all());
        return $updated ? response()->json(['message' => 'Resource updated']) : response()->json(['message' => 'Resource not found'], 404);
      `,
} satisfies IMethod;
