export default {
  methodName: 'firstOrNew',
  route: `Route::post('{{tableNameKebabCasePlural}}/first-or-new', [{{tableNamePascalCase}}Controller::class, 'firstOrNew'])->name('{{tableNameKebabCasePlural}}.first-or-new');`,
  description: 'Find or return a new record instance',
  repositoryMethod: `firstOrNew(array $attributes, array $values = []): Model`,
  repositoryContent: `return $this->model->firstOrNew($attributes, $values);`,
  serviceMethod: `firstOrNew(array $attributes, array $values = []): Model`,
  serviceContent: `
        return $this->repository->firstOrNew($attributes, $values);
      `,
  controllerMethod: `firstOrNew(Request $request)`,
  controllerContent: `
        $attributes = $request->input('attributes', []);
        $values = $request->input('values', []);
        $item = $this->service->firstOrNew($attributes, $values);
        return response()->json($item);
      `,
};
