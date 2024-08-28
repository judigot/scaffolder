import { convertToUrlFormat, toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

export const generateModelSpecificMethods = ({
  schemaInfo,
  fileToGenerate,
}: {
  schemaInfo: ISchemaInfo;
  fileToGenerate: 'interface' | 'repository' | 'controllerMethod' | 'routes';
}): string => {
  const { table, hasOne, hasMany, columnsInfo } = schemaInfo;
  const className = toPascalCase(table);

  // Find the primary key for the current table
  const primaryKeyColumn = columnsInfo.find((column) => column.primary_key);
  const primaryKey = primaryKeyColumn?.column_name ?? `${table}_id`; // Use primary key name from column, or fallback

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

  const generateRelationshipsMethods = ({
    relatedTables,
    relationshipType,
    returnType,
    bodyContent,
  }: {
    relatedTables: string[];
    relationshipType: 'hasOne' | 'hasMany';
    returnType: string | null;
    bodyContent: (relatedTable: string, relatedMethodName: string) => string;
  }) => {
    relatedTables.forEach((relatedTable) => {
      const relatedClass = toPascalCase(relatedTable);
      let description = '';
      let methodName = '';
      const foreignKey = columnsInfo.find(
        (column) =>
          column.foreign_key &&
          column.foreign_key.foreign_table_name === relatedTable,
      );

      const foreignKeyName = foreignKey
        ? foreignKey.column_name
        : `${relatedTable}_id`;
      const relatedMethodName =
        relationshipType === 'hasMany' ? `${relatedTable}s` : relatedTable;

      if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
        description = `Get the related ${relatedClass}.`;
        methodName = `get${relatedClass}${relationshipType === 'hasMany' ? 's' : ''}`;
      }

      if (fileToGenerate === 'controllerMethod') {
        description = `Get all ${relatedClass} related to the given ${className}.`;
        methodName = `get${relatedClass}s`;
      }

      methods += generateMethod(
        description,
        returnType,
        methodName,
        bodyContent(foreignKeyName, relatedMethodName),
        primaryKey,
      );
    });
  };

  if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
    generateRelationshipsMethods({
      relatedTables: hasOne,
      relationshipType: 'hasOne',
      returnType: `?${className}`,
      bodyContent: (_, relatedMethodName) =>
        `return $this->model->find($${primaryKey})?->${relatedMethodName};`,
    });

    generateRelationshipsMethods({
      relatedTables: hasMany,
      relationshipType: 'hasMany',
      returnType: '?Collection',
      bodyContent: (_, relatedMethodName) =>
        `return $this->model->find($${primaryKey})?->${relatedMethodName};`,
    });

    columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const foreignTablePrimaryKey = column.column_name; // Use the current foreign key column name
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
    generateRelationshipsMethods({
      relatedTables: hasMany,
      relationshipType: 'hasMany',
      returnType: null,
      bodyContent: (_, relatedMethodName) =>
        `$${relatedMethodName} = $this->repository->get${toPascalCase(
          relatedMethodName,
        )}($${primaryKey});
        return response()->json($${relatedMethodName});`,
    });
  }

  if (fileToGenerate === 'routes') {
    methods += hasMany
      .map(
        (relatedTable) =>
          `Route::get('${convertToUrlFormat(`${table}s/{id}/${relatedTable}s`)}', [${className}Controller::class, 'get${toPascalCase(
            relatedTable,
          )}s']);`,
      )
      .join('\n');
  }

  return methods;
};
