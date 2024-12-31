// deno-lint-ignore-file
import {
  IMethods,
  IRelationshipStructure,
} from '@/interfaces/IRepositoryPatternStructure.ts';
import { ISchemaInfo } from '@/interfaces/interfaces.ts';

interface IDomainStatus {
  isOneToOne: boolean;
  isOneToMany: boolean;
  isManyToMany: boolean;
  belongsTo: boolean;
  hasOne: boolean;
  hasMany: boolean;
  pivotRelationships: boolean;
  isPivot: boolean;
}

type IDomainStructure = {
  [key in keyof IMethods]: string | ((status: IDomainStatus) => string);
};

export const domainStructure = ({
  _tableInfo,
  _schemaInfo,
}: {
  _tableInfo: ISchemaInfo;
  _schemaInfo: ISchemaInfo[];
}): IDomainStructure => ({
  methodName: (status) => {
    if (status.belongsTo) {
      return 'findBy{{relatedTableNamePascal}}Id';
    }
    if (status.hasMany || status.pivotRelationships) {
      return 'get{{relatedTableNamePascalPlural}}';
    }
    if (status.hasOne) {
      return 'get{{relatedTableNamePascal}}';
    }
    return '';
  },
  route: (status) => {
    const suffix = status.hasOne
      ? '{{relatedTableNameKebabCase}}'
      : '{{relatedTableNameKebabCasePlural}}';
    return `Route::get('{{tableNameKebabCasePlural}}/{id}/${suffix}', [{{tableNamePascalCase}}Controller::class, '${status.belongsTo ? 'findBy{{relatedTableNamePascal}}Id' : status.hasOne ? 'get{{relatedTableNamePascal}}' : 'get{{relatedTableNamePascalPlural}}'}'])->name('{{tableNameKebabCasePlural}}.${suffix}');`;
  },
  description: (status) => {
    if (status.belongsTo) {
      return 'Find {{tableNamePascalCase}} by {{relatedTableName}}_id.';
    }
    return `Get the related ${status.hasOne ? '{{relatedTableNamePascal}}' : '{{relatedTableNamePascalPlural}}'} related to the given {{tableNamePascalCase}}.`;
  },
  repositoryMethod: (status) => {
    const returnType = status.hasOne
      ? '?{{relatedTableNamePascal}}'
      : '?Collection';

    if (status.belongsTo) {
      return `
    /**
     * Find {{tableNamePascalCase}} by {{relatedTableName}}_id.
     *
     * @param int \${{relatedTableName}}_id
     * @return ?{{tableNamePascalCase}}
     */
    public function findBy{{relatedTableNamePascal}}Id(int \${{primaryKey}}, ?string $column = null, string $direction = 'asc'): ?{{tableNamePascalCase}}`;
    }

    return `
    /**
     * Get the related ${status.hasOne ? '{{relatedTableNamePascal}}' : '{{relatedTableNamePascalPlural}}'}.
     *
     * @param int \${{primaryKey}}
     * @return ${returnType}
     */
    public function ${status.hasOne ? 'get{{relatedTableNamePascal}}' : 'get{{relatedTableNamePascalPlural}}'}(int \${{primaryKey}}, ?string $column = null, string $direction = 'asc'): ${returnType}`;
  },
  repositoryContent: (status) => {
    if (status.belongsTo) {
      return `
    {
        return $this->model->where('{{relatedTableName}}_id', \${{primaryKey}})->first();
    }`;
    }

    if (status.hasOne) {
      return `
    {
        return $this->model->find(\${{primaryKey}})?->{{relatedTableName}};
    }`;
    }

    if (status.hasMany || status.pivotRelationships) {
      return `
    {
        \${{relatedTableName}}Model = new {{relatedTableNamePascal}}();
        $query = $this->model->find(\${{primaryKey}})?->{{relatedTableNamePlural}}();
        $column = $column ?? \${{relatedTableName}}Model->getKeyName();
        $query->orderBy($column, $direction);
        return $query ? $query->get() : null;
    }`;
    }

    return '';
  },
  serviceMethod: () => {
    return '';
  },
  serviceContent: () => {
    return '';
  },
  controllerMethod: () => {
    return '';
  },
  controllerContent: () => {
    return '';
  },
});

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
    'findBy{{tableNamePascalCase}}Id(int ${{primaryKey}}): ?{{relatedTableNamePascal}}',
  childRepositoryContent:
    "return $this->model->where('{{primaryKey}}', ${{primaryKey}})->first();",
  childServiceMethod:
    'findBy{{tableNamePascalCase}}Id(int ${{primaryKey}}): ?{{relatedTableNamePascal}}',
  childServiceContent:
    'return $this->repository->findBy{{tableNamePascalCase}}Id(${{primaryKey}});',
  childControllerMethod:
    'findBy{{tableNamePascalCase}}Id(Request $request, int ${{primaryKey}})',
  childControllerContent: `// Find the {{relatedTableName}} by {{primaryKey}}
\${{relatedTableName}} = $this->repository->findBy{{tableNamePascalCase}}Id(\${{primaryKey}});
return response()->json(\${{relatedTableName}});
`,
} satisfies IRelationshipStructure;
