export default {
  methodName: 'updateOrCreate',
  route: `Route::post('{{tableNameKebabCasePlural}}/update-or-create', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.update-or-create');`,
  description: 'Create or update a record',
  repositoryMethod: `{{methodName}}(array $attributes, array $values = []): Model`,
  repositoryContent: `
      return $this->model->updateOrCreate($attributes, $values);
      `,
  serviceMethod: `{{methodName}}(array $attributes, array $values = []): Model`,
  serviceContent: `
      return $this->repository->{{methodName}}($attributes, $values);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $attributes = $request->input('attributes', []);
      $values = $request->input('values', []);
      $item = $this->service->{{methodName}}($attributes, $values);
      return response()->json($item);
      `,
};
