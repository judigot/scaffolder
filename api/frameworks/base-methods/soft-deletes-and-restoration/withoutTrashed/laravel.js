export default {
  methodName: 'withoutTrashed',
  route: `Route::get('{{tableNameKebabCasePlural}}/without-trashed', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.without-trashed');`,
  description: 'Retrieve records excluding soft-deleted ones',
  repositoryMethod: `{{methodName}}(): Collection`,
  repositoryContent: `return $this->model->withoutTrashed()->get();`,
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
