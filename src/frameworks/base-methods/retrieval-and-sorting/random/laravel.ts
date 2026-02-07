import type { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'random',
  route: `Route::get('{{tableName.plural.kebabCase}}/random', [{{tableName.pascalCase}}Controller::class, '{{methodName}}'])->name('{{tableName.plural.kebabCase}}.random');`,
  description: 'Retrieve random records',
  repositoryMethod: `{{methodName}}(int $count = 1): Collection`,
  repositoryContent: `return $this->model->inRandomOrder()->limit($count)->get();`,
  serviceMethod: `{{methodName}}(int $count = 1): Collection`,
  serviceContent: `
      return $this->repository->{{methodName}}($count);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $count = $request->input('count', 1);
      $items = $this->service->{{methodName}}($count);
      return response()->json($items);
      `,
} satisfies IMethod;
