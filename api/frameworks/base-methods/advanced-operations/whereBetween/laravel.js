export default {
  methodName: 'whereBetween',
  route: `Route::post('{{tableNameKebabCasePlural}}/where-between', [{{tableNamePascalCase}}Controller::class, 'whereBetween'])->name('{{tableNameKebabCasePlural}}.where-between');`,
  description: 'Filter records between two values',
  repositoryMethod: `whereBetween(string $column, array $range): Collection`,
  repositoryContent: `return $this->model->whereBetween($column, $range)->get();`,
  serviceMethod: `whereBetween(string $column, array $range): Collection`,
  serviceContent: `
        return $this->repository->whereBetween($column, $range);
      `,
  controllerMethod: `whereBetween(Request $request)`,
  controllerContent: `
        $column = $request->input('column');
        $range = $request->input('range', []);
        $items = $this->service->whereBetween($column, $range);
        return response()->json($items);
      `,
};
