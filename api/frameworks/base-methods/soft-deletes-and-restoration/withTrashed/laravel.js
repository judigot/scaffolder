export default {
  methodName: 'withTrashed',
  route: `Route::get('{{tableNameKebabCasePlural}}/with-trashed', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.with-trashed');`,
  description: 'Retrieve all records including soft-deleted ones',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->withTrashed()->get();`,
  serviceMethod: `{{methodName}}(): Collection`,
  serviceContent: `
      return $this->repository->{{methodName}}();
      `,
  controllerMethod: `{{methodName}}()`,
  controllerContent: `
      $items = $this->service->{{methodName}}();
      return response()->json($items);
      `,
};
