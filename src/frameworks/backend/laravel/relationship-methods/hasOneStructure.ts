import { IRelationshipStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'One-to-One Relationship',
  methodName: 'get{{relatedTableNamePascal}}',
  route:
    "Route::get('{{tableNameKebabCasePlural}}/{id}/{{relatedTableNameKebabCase}}', [{{tableNamePascalCase}}Controller::class, 'get{{relatedTableNamePascal}}'])->name('{{tableNameKebabCasePlural}}.{{relatedTableNameKebabCase}}');",
  description:
    'Get the related {{relatedTableNamePascal}} related to the given {{tableNamePascalCase}}.',
  repositoryMethod:
    'get{{relatedTableNamePascal}}(int $id): ?{{relatedTableNamePascal}}',
  repositoryContent: 'return $this->model->find($id)?->{{relatedTableName}};',
  serviceMethod:
    'get{{relatedTableNamePascal}}(int $id): ?{{relatedTableNamePascal}}',
  serviceContent:
    'return $this->repository->get{{relatedTableNamePascal}}($id);',
  controllerMethod: 'get{{relatedTableNamePascal}}(Request $request, int $id)',
  controllerContent:
    '// Fetch the {{relatedTableName}} from the repository\n${{relatedTableName}} = $this->repository->get{{relatedTableNamePascal}}($id);\nreturn response()->json(${{relatedTableName}});',

  childRepositoryMethod: '',
  childRepositoryContent: '',
  childServiceMethod: '',
  childServiceContent: '',
  childControllerMethod: '',
  childControllerContent: '',
} satisfies IRelationshipStructure;
