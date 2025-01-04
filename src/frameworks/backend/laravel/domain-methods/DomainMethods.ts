import { IDomainStructure } from '@/interfaces/IRepositoryPatternStructure.ts';

export default {
  group: 'CRUD',
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
      route: ({ hasOne }) => {
        const suffix = hasOne
          ? '{{relatedTableNameKebabCase}}'
          : '{{relatedTableNameKebabCasePlural}}';
        return `Route::get('{{tableNameKebabCasePlural}}/{id}/${suffix}', [{{tableNamePascalCase}}Controller::class, '{{methodName}}'])->name('{{tableNameKebabCasePlural}}.${suffix}');`;
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
      public function {{methodName}}(int \${{primaryKey}}, ?string $column = null, string $direction = 'asc'): ?{{tableNamePascalCase}}`;
        }

        return `
      /**
       * Get the related ${hasOne ? '{{relatedTableNamePascal}}' : '{{relatedTableNamePascalPlural}}'}.
       *
       * @param int \${{primaryKey}}
       * @return ${returnType}
       */
      public function {{methodName}}(int \${{primaryKey}}, ?string $column = null, string $direction = 'asc'): ${returnType}`;
      },
      repositoryContent: ({
        hasOne,
        hasMany,
        pivotRelationships,
        belongsTo,
      }) => {
        if (hasOne) {
          return `
      {{repositoryMethod}}
      {
          return $this->model->find(\${{primaryKey}})?->{{relatedTableName}};
      }`;
        }
        if (hasMany || pivotRelationships) {
          return `
      {{repositoryMethod}}
      {
          \${{relatedTableName}}Model = new {{relatedTableNamePascal}}();
          $query = $this->model->find(\${{primaryKey}})?->{{relatedTableNamePlural}}();
          $column = $column ?? \${{relatedTableName}}Model->getKeyName();
          $query->orderBy($column, $direction);
          return $query ? $query->get() : null;
      }`;
        }
        if (belongsTo) {
          return `
      {{repositoryMethod}}
      {
          return $this->model->where('{{relatedTableName}}_id', \${{primaryKey}})->first();
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
      controllerMethod: '{{methodName}}(Request $request, int $id)',
      controllerContent: ({
        hasOne,
        hasMany,
        pivotRelationships,
        belongsTo,
      }) => {
        if (hasOne) {
          return `
          // Fetch the \${{relatedTableName}} from the repository
          \${{relatedTableName}} = $this->repository->{{methodName}}($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{relatedTableName}});`;
        }
        if (hasMany || pivotRelationships) {
          return `
          // Fetch the \${{relatedTableNamePlural}} from the repository
          \${{relatedTableNamePlural}} = $this->repository->{{methodName}}($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{relatedTableNamePlural}});`;
        }
        if (belongsTo) {
          return `
          // Find \${{tableNameSingular}} by \${{relatedTableName}}_id
          \${{tableNameSingular}} = $this->repository->{{methodName}}($id, $request->query('column'), $request->query('direction', 'asc'));
          return response()->json(\${{tableNameSingular}});`;
        }
        return '';
      },
    },
    // {
    //   methodName: ({ hasMany }) => {
    //     if (hasMany) {
    //       return 'getAllWithRelated{{relatedTableNamePascalPlural}}';
    //     }
    //     return '';
    //   },
    //   route: () => {
    //     return `Route::get('{{tableNameKebabCasePlural}}', [{{tableNamePascalCase}}Controller::class, 'getAllWithRelated{{relatedTableNamePascalPlural}}'])->name('{{tableNameKebabCasePlural}}.getAllWithRelated');`;
    //   },
    //   description: () =>
    //     'Get all {{tableNamePascalCase}} records with optional related {{relatedTableNamePascalPlural}}.',
    //   repositoryMethod: () => `
    //   /**
    //    * Get all records with optional related data.
    //    *
    //    * @param bool $includeRelated
    //    * @param string|null $column
    //    * @param string $direction
    //    * @return Collection
    //    */
    //   public function getAllWithRelated{{relatedTableNamePascalPlural}}(bool $includeRelated = false, ?string $column = null, string $direction = 'asc'): Collection`,
    //   repositoryContent: () => `
    //   {
    //       $query = $this->model->query();

    //       if ($includeRelated) {
    //           $query->with('{{relatedTableNamePlural}}');
    //       }

    //       $column = $column ?? $this->model->getKeyName();
    //       return $query->orderBy($column, $direction)->get();
    //   }`,
    //   controllerMethod: () =>
    //     'getAllWithRelated{{relatedTableNamePascalPlural}}(Request $request)',
    //   controllerContent: () => `
    //       $includeRelated = filter_var($request->query('include{{relatedTableNamePascalPlural}}', false), FILTER_VALIDATE_BOOLEAN);
    //       $records = $this->repository->getAllWithRelated{{relatedTableNamePascalPlural}}(
    //           $includeRelated,
    //           $request->query('column'),
    //           $request->query('direction', 'asc')
    //       );
    //       return response()->json($records);`,
    //   serviceMethod: () => '',
    //   serviceContent: () => '',
    // },
  ],
} satisfies IDomainStructure;
