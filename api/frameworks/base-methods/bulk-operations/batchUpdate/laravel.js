export default {
  methodName: 'batchUpdate',
  route: `Route::post('{{tableNameKebabCasePlural}}/batch-update', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.batch-update');`,
  description: 'Batch update multiple records',
  repositoryMethod: `{{methodName}}(array $criteria, array $data): bool`,
  repositoryContent: `
      return $this->model->where($criteria)->update($data) > 0;
      `,
  serviceMethod: `{{methodName}}(array $criteria, array $data): bool`,
  serviceContent: `
      return $this->repository->{{methodName}}($criteria, $data);
      `,
  controllerMethod: `{{methodName}}(Request $request)`,
  controllerContent: `
      $criteria = $request->input('criteria', []);
      $data = $request->input('data', []);
      $updated = $this->service->{{methodName}}($criteria, $data);
      return response()->json(['updated' => $updated]);
      `,
};
