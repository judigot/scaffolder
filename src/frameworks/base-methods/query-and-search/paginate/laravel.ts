import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'paginate',
  route: `Route::get('{{tableName.plural.kebabCase}}/paginate', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.paginate');`,
  description: 'Paginate records',
  repositoryMethod: `{{methodName}}(int $perPage = 15)`,
  repositoryContent: `return $this->model->paginate($perPage);`,
  serviceMethod: `{{methodName}}(int $perPage = 15)`,
  serviceContent: `
        return $this->repository->{{methodName}}($perPage);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
        $perPage = $request->input('per_page', 15);
        $items = $this->service->{{methodName}}($perPage);
        return response()->json($items);
      `,
} satisfies IMethod;
