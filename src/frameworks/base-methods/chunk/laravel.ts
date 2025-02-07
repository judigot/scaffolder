import { IMethod } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  methodName: 'chunk',
  route: `Route::post('{{tableNameKebabCasePlural}}/chunk', [{{tableNamePascalCase}}Controller::class, 'chunk'])->name('{{tableNameKebabCasePlural}}.chunk');`,
  description: 'Chunk records for processing',
  repositoryMethod: `chunk(int $size, callable $callback): bool`,
  repositoryContent: `return $this->model->chunk($size, $callback);`,
  serviceMethod: `chunk(int $size, callable $callback): bool`,
  serviceContent: `
        return $this->repository->chunk($size, $callback);
      `,
  controllerMethod: `chunk(Request $request)`,
  controllerContent: `
        $size = $request->input('size', 100);
        $callback = function ($items) {
            return response()->json($items);
        };
        $this->service->chunk($size, $callback);
      `,
} satisfies IMethod;
