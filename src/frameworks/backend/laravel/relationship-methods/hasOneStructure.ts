import { IRelationshipStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

// interface IDomainStatus {
//   isOneToOne: boolean;
//   isOneToMany: boolean;
//   isManyToMany: boolean;
//   isParent: boolean;
//   isChild: boolean;
//   isPivot: boolean;
// }

// interface IDomainStructure {
//   route: (props: IDomainStatus) => string;
//   description: (props: IDomainStatus) => string;
//   repositoryMethod: (props: IDomainStatus) => string;
//   repositoryContent: (props: IDomainStatus) => string;
//   serviceMethod: (props: IDomainStatus) => string;
//   serviceContent: (props: IDomainStatus) => string;
//   controllerMethod: (props: IDomainStatus) => string;
//   controllerContent: (props: IDomainStatus) => string;
// }

// const domainStructure: IDomainStructure = {
//   route: (props: IDomainStatus) => "",
//   description: (props: IDomainStatus) => "",
//   repositoryMethod: (props: IDomainStatus) => "",
//   repositoryContent: (props: IDomainStatus) => "",
//   serviceMethod: (props: IDomainStatus) => "",
//   serviceContent: (props: IDomainStatus) => "",
//   controllerMethod: (props: IDomainStatus) => "",
//   controllerContent: (props: IDomainStatus) => "",
// };

export default {
  group: 'One-to-One Relationship',
  methodName: 'get{{relatedTableNamePascal}}',
  route:
    "Route::get('{{tableNameKebabCasePlural}}/{id}/{{relatedTableNameKebabCase}}', [{{tableNamePascalCase}}Controller::class, 'get{{relatedTableNamePascal}}'])->name('{{tableNameKebabCasePlural}}.{{relatedTableNameKebabCase}}');",
  description:
    'Get the related {{relatedTableNamePascal}} related to the given {{tableNamePascalCase}}.',
  repositoryMethod: `
/**
  * Get the related {{relatedTableNamePascal}}.
  *
  * @param int \${{primaryKey}}
  * @return ?{{relatedTableNamePascal}}
 */
public function get{{relatedTableNamePascal}}(int \${{primaryKey}}, ?string $column = null, string $direction = 'asc'): ?{{relatedTableNamePascal}};
`,
  repositoryContent:
    'return $this->model->find(${{primaryKey}})?->{{relatedTableName}};',
  serviceMethod:
    "get{{relatedTableNamePascal}}(int $id, ?string $column = null, string $direction = 'asc'): ?{{relatedTableNamePascal}}",
  serviceContent:
    'return $this->repository->get{{relatedTableNamePascal}}($id, $column, $direction);',
  controllerMethod: 'get{{relatedTableNamePascal}}(Request $request, int $id)',
  controllerContent: `// Fetch the {{relatedTableName}} from the repository
\${{relatedTableName}} = $this->repository->get{{relatedTableNamePascal}}($id, $request->query('column'), $request->query('direction', 'asc'));
return response()->json(\${{relatedTableName}});`,

  childRepositoryMethod:
    'findBy{{tableNamePascal}}Id(int ${{primaryKey}}): ?{{relatedTableNamePascal}}',
  childRepositoryContent:
    "return $this->model->where('{{primaryKey}}', ${{primaryKey}})->first();",
  childServiceMethod:
    'findBy{{tableNamePascal}}Id(int ${{primaryKey}}): ?{{relatedTableNamePascal}}',
  childServiceContent:
    'return $this->repository->findBy{{tableNamePascal}}Id(${{primaryKey}});',
  childControllerMethod:
    'findBy{{tableNamePascal}}Id(Request $request, int ${{primaryKey}})',
  childControllerContent: `// Find the {{relatedTableName}} by {{primaryKey}}
\${{relatedTableName}} = $this->repository->findBy{{tableNamePascal}}Id(\${{primaryKey}});
return response()->json(\${{relatedTableName}});
`,
} satisfies IRelationshipStructure;
