import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'random',
  route: `Route::get('{{tableNameKebabCasePlural}}/random', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.random');`,
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
