import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'index',
  route: `Route::get('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.{{methodName}}');`,
  description: 'Get all records',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->all();`,
  serviceMethod: `{{methodName}}()`,
  serviceContent: `
        return $this->repository->{{methodName}}();
      `,
  controllerMethod: `{{methodName}}()`,
  controllerContent: `
        $items = $this->service->{{methodName}}();
        return response()->json($items);
      `,
} satisfies IMethod;
