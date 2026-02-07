import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'findById',
  route: `Route::get('{{tableName.plural.kebabCase}}/{id}', [{{tableName.pascalCase}}Controller::class, 'show'])->name('{{tableName.plural.kebabCase}}.show');`,
  description: 'Find a specific record by ID',
  repositoryMethod: `{{methodName}}(int $id): ?Model`,
  repositoryContent: `return $this->model->find($id);`,
  serviceMethod: `{{methodName}}($id)`,
  serviceContent: `
        return $this->repository->{{methodName}}($id);
      `,
  controllerMethod: `show($id)`,
  controllerContent: `
        $item = $this->service->{{methodName}}($id);
        return $item ? response()->json($item) : response()->json(['message' => 'Resource not found'], 404);
      `,
} satisfies IMethod;
