import { IDomainStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Domain Relations',
  methods: [
    {
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
      controllerMethod: (status) => {
        if (status.belongsTo) {
          return 'findBy{{relatedTableNamePascal}}Id(Request $request, int $id)';
        }
        if (status.hasMany || status.pivotRelationships) {
          return 'get{{relatedTableNamePascalPlural}}(Request $request, int $id)';
        }
        if (status.hasOne) {
          return 'get{{relatedTableNamePascal}}(Request $request, int $id)';
        }
        return '';
      },
      controllerContent: (status) => {
        if (status.belongsTo) {
          return `
          // Find \${{tableNameSingular}} by \${{relatedTableName}}_id
          \${{tableNameSingular}} = $this->repository->findBy{{relatedTableNamePascal}}Id($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{tableNameSingular}});`;
        }
        if (status.hasMany || status.pivotRelationships) {
          return `
          // Fetch the \${{relatedTableNamePlural}} from the repository
          \${{relatedTableNamePlural}} = $this->repository->get{{relatedTableNamePascalPlural}}($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{relatedTableNamePlural}});`;
        }
        if (status.hasOne) {
          return `
          // Fetch the \${{relatedTableName}} from the repository
          \${{relatedTableName}} = $this->repository->get{{relatedTableNamePascal}}($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{relatedTableName}});`;
        }
        return '';
      },
    },
  ],
} satisfies IDomainStructure;
