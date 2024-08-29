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

  const { table, tablePlural, pivotRelationships, columnsInfo, hasMany } =
    tableInfo;
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
  ) => `
    /**
     * ${description}
     *
     * @param int $${paramName}
     * ${returnType != null ? `@return ${returnType}` : ''}
     */
    public function ${methodName}(int $${paramName})${returnType != null ? `: ${returnType}` : ''}${
      fileToGenerate === 'interface'
        ? ';'
        : ` {
        ${body}
    }`
    }
  `;

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
  ) => {
    relatedTables.forEach((relatedTable) => {
      const relatedClass = toPascalCase(relatedTable);
      const relatedTablePlural = getTablePlural(relatedTable);
      const description = isController
        ? `${descriptionPrefix} ${relatedClass}s related to the given ${className}.`
        : `${descriptionPrefix} ${relatedClass}s.`;
      const methodName = `get${relatedClass}s`;
      const returnType = `?Collection`;
      const body = `return $this->model->find($${primaryKey})?->${relatedTablePlural};`;

      methods += generateMethod(
        description,
        isController ? null : returnType,
        methodName,
        isController
          ? `
        $${relatedTablePlural} = $this->repository->get${relatedClass}s($${primaryKey});
        return response()->json($${relatedTablePlural});
      `
          : body,
        primaryKey,
      );
    });
  };

  if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
    generateRelationshipMethods(
      pivotRelationships.map(({ relatedTable }) => relatedTable),
      false,
      'Get the related', // Prefix for repository and interface
    );

    if (pivotRelationships.length === 0) {
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

  if (fileToGenerate === 'controllerMethod') {
    generateRelationshipMethods(
      pivotRelationships.map(({ relatedTable }) => relatedTable),
      true,
      'Get all', // Prefix for controller methods
    );

    if (pivotRelationships.length === 0) {
      generateRelationshipMethods(hasMany, true, 'Get all');
    }
  }

  if (fileToGenerate === 'routes') {
    methods += pivotRelationships
      .map(
        ({ relatedTable }) =>
          `Route::get('${convertToUrlFormat(`${tablePlural}/{id}/${getTablePlural(relatedTable)}`)}', [${className}Controller::class, 'get${toPascalCase(
            relatedTable,
          )}s']);`,
      )
      .join('\n');

    if (pivotRelationships.length === 0) {
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
