import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'search',
  route: `Route::get('{{tableNameKebabCasePlural}}/search', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.search');`,
  description: 'Search records',
  repositoryMethod: `{{methodName}}(string $query, array $fields, int $perPage = 15)`,
  repositoryContent: `
        return $this->model->where(function ($q) use ($query, $fields) {
            foreach ($fields as $field) {
                $q->orWhere($field, 'LIKE', "%$query%");
            }
        })->paginate($perPage);
      `,
  serviceMethod: `{{methodName}}(string $query, array $fields, int $perPage = 15)`,
  serviceContent: `
      
        return $this->repository->{{methodName}}($query, $fields, $perPage);
      
    `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      
        $query = $request->input('query');
        $fields = $request->input('fields', []);
        $perPage = $request->input('per_page', 15);
        $results = $this->service->{{methodName}}($query, $fields, $perPage);
        return response()->json($results);
      
    `,
} satisfies IMethod;
