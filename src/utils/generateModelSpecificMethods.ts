import { convertToUrlFormat, toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces';

export const generateModelSpecificMethods = ({
  targetTable,
  schemaInfo,
  fileToGenerate,
}: {
  targetTable: ISchemaInfo['table'];
  schemaInfo: ISchemaInfo[];
  fileToGenerate: 'interface' | 'repository' | 'controllerMethod' | 'routes';
}): string => {
  const tableInfo = schemaInfo.find((table) => table.table === targetTable);
  if (!tableInfo) return '';

  const {
    table,
    tablePlural,
    pivotRelationships,
    columnsInfo,
    hasOne,
    hasMany,
  } = tableInfo;
  const className = toPascalCase(table);

  // Find the primary key for the current table
  const primaryKeyColumn: IColumnInfo | undefined = columnsInfo.find(
    (column) => column.primary_key,
  );
  const primaryKey = primaryKeyColumn?.column_name ?? `${table}_id`;

  const generateMethod = (
    description: string,
    returnType: string | null,
    methodName: string,
    body: string,
    paramName: string,
    isController = false,
  ) => {
    let params: string;
    if (isController) {
      params = `(Request $request, int $${paramName})`;
    } else {
      params = `(int $${paramName}, ?string $column = null, string $direction = 'asc')`;
    }

    let returnTypeDeclaration = '';
    if (returnType != null) {
      returnTypeDeclaration = `: ${returnType}`;
    }

    let methodBody: string;
    if (fileToGenerate === 'interface') {
      methodBody = ';';
    } else {
      methodBody = `{
          ${body}
      }`;
    }

    return `
      /**
       * ${description}
       *
       * @param int $${paramName}
       * ${returnType != null ? `@return ${returnType}` : ''}
       */
      public function ${methodName}${params}${returnTypeDeclaration}${methodBody}
    `;
  };

  let methods = '';

  const getTablePlural = (tableName: string): string => {
    const relatedSchema = schemaInfo.find(
      (schema) => schema.table === tableName,
    );
    return relatedSchema ? relatedSchema.tablePlural : tableName;
  };

  const generateRelationshipMethods = (
    relatedTables: string[],
    isController: boolean,
    descriptionPrefix: string,
    isHasOne = false,
  ) => {
    relatedTables.forEach((relatedTable) => {
      const relatedClass = toPascalCase(relatedTable);
      const relatedTablePlural = getTablePlural(relatedTable);
      const relatedTableName = isHasOne ? relatedTable : relatedTablePlural;
      const description = isController
        ? `${descriptionPrefix} ${relatedClass}${isHasOne ? '' : 's'} related to the given ${className}.`
        : `${descriptionPrefix} ${relatedClass}${isHasOne ? '' : 's'}.`;
      const methodName = `get${relatedClass}${isHasOne ? '' : 's'}`;
      const returnType = isHasOne ? `?${relatedClass}` : `?Collection`;
      const body = isHasOne
        ? `
        return $this->model->find($${primaryKey})?->${relatedTableName};`
        : `
        $${relatedTable}Model = new ${relatedClass}();
        $query = $this->model->find($${primaryKey})?->${relatedTableName}();
        $column = $column ?? $${relatedTable}Model->getKeyName();
        $query->orderBy($column, $direction);
        return $query ? $query->get() : null;
        `;

      methods += generateMethod(
        description,
        isController ? null : returnType,
        methodName,
        isController
          ? `${
              isHasOne
                ? ''
                : `
        // Extract optional URL parameters
        $column = $request->input('column', null); // Default to null if no column is provided
        $direction = $request->input('direction', 'asc'); // Default to 'asc' if no direction is provided\n`
            }
        // Fetch the ${relatedTableName} from the repository
        $${relatedTableName} = $this->repository->get${relatedClass}${isHasOne ? '' : 's'}($${primaryKey}${isHasOne ? '' : ', $column, $direction'});
        return response()->json($${relatedTableName});
      `
          : body,
        primaryKey,
        isController,
      );
    });
  };

  // Handle repository and interface file generation
  if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
    if (pivotRelationships.length > 0) {
      generateRelationshipMethods(
        pivotRelationships.map(({ relatedTable }) => relatedTable),
        false,
        'Get the related', // Prefix for repository and interface
      );
    } else if (hasOne.length > 0) {
      generateRelationshipMethods(hasOne, false, 'Get the related', true);
    } else if (hasMany.length > 0) {
      generateRelationshipMethods(hasMany, false, 'Get the related');
    }

    columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const foreignTablePrimaryKey = column.column_name;
        const description = `Find ${className} by ${foreignTablePrimaryKey}.`;
        const methodName = `findBy${toPascalCase(foreignTablePrimaryKey)}`;
        const returnType = `?${className}`;
        const body = `return $this->model->where('${foreignTablePrimaryKey}', $${foreignTablePrimaryKey})->first();`;

        methods += generateMethod(
          description,
          returnType,
          methodName,
          body,
          foreignTablePrimaryKey,
        );
      }
    });
  }

  // Handle controller method generation
  if (fileToGenerate === 'controllerMethod') {
    if (pivotRelationships.length > 0) {
      generateRelationshipMethods(
        pivotRelationships.map(({ relatedTable }) => relatedTable),
        true,
        'Get all', // Prefix for controller methods
      );
    } else if (hasOne.length > 0) {
      generateRelationshipMethods(hasOne, true, 'Get the related', true);
    } else if (hasMany.length > 0) {
      generateRelationshipMethods(hasMany, true, 'Get all');
    }
  }

  // Handle route generation
  if (fileToGenerate === 'routes') {
    if (pivotRelationships.length > 0) {
      methods += pivotRelationships
        .map(
          ({ relatedTable }) =>
            `Route::get('${convertToUrlFormat(`${tablePlural}/{id}/${getTablePlural(relatedTable)}`)}', [${className}Controller::class, 'get${toPascalCase(
              relatedTable,
            )}s']);`,
        )
        .join('\n');
    } else if (hasOne.length > 0) {
      methods += hasOne
        .map(
          (relatedTable) =>
            `Route::get('${convertToUrlFormat(`${tablePlural}/{id}/${relatedTable}`)}', [${className}Controller::class, 'get${toPascalCase(
              relatedTable,
            )}']);`,
        )
        .join('\n');
    } else if (hasMany.length > 0) {
      methods += hasMany
        .map(
          (relatedTable) =>
            `Route::get('${convertToUrlFormat(`${tablePlural}/{id}/${getTablePlural(relatedTable)}`)}', [${className}Controller::class, 'get${toPascalCase(
              relatedTable,
            )}s']);`,
        )
        .join('\n');
    }
  }

  return methods;
};
