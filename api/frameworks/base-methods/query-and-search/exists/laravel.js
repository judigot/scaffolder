export default {
  methodName: 'exists',
  route: `Route::get('{{tableNameKebabCasePlural}}/exists', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.exists');`,
  description: 'Check if a record exists',
  repositoryMethod: `{{methodName}}(array $criteria): bool`,
  repositoryContent: `return $this->model->where($criteria)->exists();`,
  serviceMethod: `{{methodName}}(array $criteria): bool`,
  serviceContent: `
        return $this->repository->{{methodName}}($criteria);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
        $criteria = $request->all();
        $exists = $this->service->{{methodName}}($criteria);
        return response()->json(['exists' => $exists]);
      `,
};
