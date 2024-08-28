import { convertToUrlFormat, toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

export const generateModelSpecificMethods = ({
  schemaInfo,
  fileToGenerate,
}: {
  schemaInfo: ISchemaInfo;
  fileToGenerate: 'interface' | 'repository' | 'controllerMethod' | 'routes';
}): string => {
  const { table, pivotRelationships, columnsInfo } = schemaInfo;
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

  const generatePivotRelationshipMethods = () => {
    pivotRelationships.forEach(({ relatedTable }) => {
      const relatedClass = toPascalCase(relatedTable);
      const description = `Get the related ${relatedClass}.`;
      const methodName = `get${relatedClass}s`;
      const returnType = `?Collection`;
      const body = `return $this->model->find($${primaryKey})?->${relatedTable}s;`;

      methods += generateMethod(
        description,
        returnType,
        methodName,
        body,
        primaryKey,
      );
    });
  };

  const generateControllerPivotMethods = () => {
    pivotRelationships.forEach(({ relatedTable, pivotTable }) => {
      const relatedClass = toPascalCase(relatedTable);
      const description = `Get all ${String(pivotTable)} related to the given ${className}.`;
      const methodName = `get${relatedClass}s`;

      const body = `
        $${relatedTable} = $this->repository->get${relatedClass}s($${primaryKey});
        return response()->json($${relatedTable});
      `;

      methods += generateMethod(
        description,
        null,
        methodName,
        body,
        primaryKey,
      );
    });
  };

  if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
    generatePivotRelationshipMethods();

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
    generateControllerPivotMethods();
  }

  if (fileToGenerate === 'routes') {
    methods += pivotRelationships
      .map(
        ({ relatedTable }) =>
          `Route::get('${convertToUrlFormat(`${table}s/{id}/${relatedTable}s`)}', [${className}Controller::class, 'get${toPascalCase(
            relatedTable,
          )}s']);`,
      )
      .join('\n');
  }

  return methods;
};
