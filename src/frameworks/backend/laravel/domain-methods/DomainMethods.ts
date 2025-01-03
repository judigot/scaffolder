import { IDomainStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'Domain Relations',
  methods: [
    {
      methodName: ({ hasOne, hasMany, pivotRelationships, belongsTo }) => {
        if (hasOne) {
          return 'get{{relatedTableNamePascal}}';
        }
        if (hasMany || pivotRelationships) {
          return 'get{{relatedTableNamePascalPlural}}';
        }
        if (belongsTo) {
          return 'findBy{{relatedTableNamePascal}}Id';
        }
        return '';
      },
      route: ({ hasOne, belongsTo }) => {
        const suffix = hasOne
          ? '{{relatedTableNameKebabCase}}'
          : '{{relatedTableNameKebabCasePlural}}';
        return `Route::get('{{tableNameKebabCasePlural}}/{id}/${suffix}', [{{tableNamePascalCase}}Controller::class, '${belongsTo ? 'findBy{{relatedTableNamePascal}}Id' : hasOne ? 'get{{relatedTableNamePascal}}' : 'get{{relatedTableNamePascalPlural}}'}'])->name('{{tableNameKebabCasePlural}}.${suffix}');`;
      },
      description: ({ hasOne, belongsTo }) => {
        if (belongsTo) {
          return 'Find {{tableNamePascalCase}} by {{relatedTableName}}_id.';
        }
        return `Get the related ${hasOne ? '{{relatedTableNamePascal}}' : '{{relatedTableNamePascalPlural}}'} related to the given {{tableNamePascalCase}}.`;
      },
      repositoryMethod: ({ hasOne, belongsTo }) => {
        const returnType = hasOne
          ? '?{{relatedTableNamePascal}}'
          : '?Collection';

        if (belongsTo) {
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
       * Get the related ${hasOne ? '{{relatedTableNamePascal}}' : '{{relatedTableNamePascalPlural}}'}.
       *
       * @param int \${{primaryKey}}
       * @return ${returnType}
       */
      public function ${hasOne ? 'get{{relatedTableNamePascal}}' : 'get{{relatedTableNamePascalPlural}}'}(int \${{primaryKey}}, ?string $column = null, string $direction = 'asc'): ${returnType}`;
      },
      repositoryContent: ({
        hasOne,
        hasMany,
        pivotRelationships,
        belongsTo,
      }) => {
        if (belongsTo) {
          return `
      {
          return $this->model->where('{{relatedTableName}}_id', \${{primaryKey}})->first();
      }`;
        }

        if (hasOne) {
          return `
      {
          return $this->model->find(\${{primaryKey}})?->{{relatedTableName}};
      }`;
        }

        if (hasMany || pivotRelationships) {
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
      controllerMethod: ({
        hasOne,
        hasMany,
        pivotRelationships,
        belongsTo,
      }) => {
        if (belongsTo) {
          return 'findBy{{relatedTableNamePascal}}Id(Request $request, int $id)';
        }
        if (hasMany || pivotRelationships) {
          return 'get{{relatedTableNamePascalPlural}}(Request $request, int $id)';
        }
        if (hasOne) {
          return 'get{{relatedTableNamePascal}}(Request $request, int $id)';
        }
        return '';
      },
      controllerContent: ({
        hasOne,
        hasMany,
        pivotRelationships,
        belongsTo,
      }) => {
        if (belongsTo) {
          return `
          // Find \${{tableNameSingular}} by \${{relatedTableName}}_id
          \${{tableNameSingular}} = $this->repository->findBy{{relatedTableNamePascal}}Id($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{tableNameSingular}});`;
        }
        if (hasMany || pivotRelationships) {
          return `
          // Fetch the \${{relatedTableNamePlural}} from the repository
          \${{relatedTableNamePlural}} = $this->repository->get{{relatedTableNamePascalPlural}}($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{relatedTableNamePlural}});`;
        }
        if (hasOne) {
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
