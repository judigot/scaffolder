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

  /* Find the primary key for the current table */
  const primaryKeyColumn: IColumnInfo | undefined = columnsInfo.find(
    (column) => column.primary_key,
  );
  let primaryKey = '';
  if (primaryKeyColumn) {
    primaryKey = primaryKeyColumn.column_name;
  } else {
    primaryKey = `${table}_id`;
  }

  const generateMethod = ({
    description,
    returnType,
    methodName,
    body,
    paramName,
    isController = false,
  }: {
    description: string;
    returnType: string | null;
    methodName: string;
    body: string;
    paramName: string;
    isController?: boolean;
  }) => {
    const params: string = isController
      ? `(Request $request, int $${paramName})`
      : `(int $${paramName}, ?string $column = null, string $direction = 'asc')`;

    let returnTypeDeclaration = '';
    if (returnType !== null) {
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

    let returnTypeComment = '';
    if (returnType !== null) {
      returnTypeComment = `@return ${returnType}`;
    }

    return `
      /**
       * ${description}
       *
       * @param int $${paramName}
       * ${returnTypeComment}
       */
      public function ${methodName}${params}${returnTypeDeclaration}${methodBody}
    `;
  };

  let methods = '';
  const generatedMethods = new Set(); // Keep track of methods that have been generated

  const getTablePlural = ({ tableName }: { tableName: string }): string => {
    const relatedSchema = schemaInfo.find(
      (schema) => schema.table === tableName,
    );
    if (relatedSchema) {
      return relatedSchema.tablePlural;
    }
    return tableName;
  };

  const generateRelationshipMethods = ({
    relatedTables,
    isController,
    descriptionPrefix,
    isHasOne = false,
  }: {
    relatedTables: string[];
    isController: boolean;
    descriptionPrefix: string;
    isHasOne?: boolean;
  }) => {
    relatedTables.forEach((relatedTable) => {
      const relatedClass = toPascalCase(relatedTable);
      const relatedTablePlural = getTablePlural({ tableName: relatedTable });
      let relatedTableName = '';

      if (isHasOne) {
        relatedTableName = relatedTable;
      } else {
        relatedTableName = relatedTablePlural;
      }

      let description = '';
      if (isController) {
        description = `${descriptionPrefix} ${relatedClass}`;
        if (!isHasOne) {
          description += 's';
        }
        description += ` related to the given ${className}.`;
      } else {
        description = `${descriptionPrefix} ${relatedClass}`;
        if (!isHasOne) {
          description += 's';
        }
        description += '.';
      }

      let methodName = `get${relatedClass}`;
      if (!isHasOne) {
        methodName += 's';
      }

      // Check if the method is already generated
      if (generatedMethods.has(methodName)) return; // Skip if already generated
      generatedMethods.add(methodName); // Mark as generated

      let returnType = '';
      if (isHasOne) {
        returnType = `?${relatedClass}`;
      } else {
        returnType = `?Collection`;
      }

      let body = '';
      if (isHasOne) {
        body = `
        return $this->model->find($${primaryKey})?->${relatedTableName};`;
      } else {
        body = `
        $${relatedTable}Model = new ${relatedClass}();
        $query = $this->model->find($${primaryKey})?->${relatedTableName}();
        $column = $column ?? $${relatedTable}Model->getKeyName();
        $query->orderBy($column, $direction);
        return $query ? $query->get() : null;
        `;
      }

      let methodBody = '';
      if (isController) {
        if (!isHasOne) {
          methodBody = `
        // Extract optional URL parameters
        $column = $request->input('column', null); // Default to null if no column is provided
        $direction = $request->input('direction', 'asc'); // Default to 'asc' if no direction is provided\n`;
        }
        methodBody += `
        // Fetch the ${relatedTableName} from the repository
        $${relatedTableName} = $this->repository->get${relatedClass}${
          isHasOne ? '' : 's'
        }($${primaryKey}${isHasOne ? '' : ', $column, $direction'});
        return response()->json($${relatedTableName});
      `;
      } else {
        methodBody = body;
      }

      methods += generateMethod({
        description,
        returnType: isController ? null : returnType,
        methodName,
        body: methodBody,
        paramName: primaryKey,
        isController,
      });
    });
  };

  /* Handle repository and interface file generation */
  if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
    if (pivotRelationships.length > 0) {
      generateRelationshipMethods({
        relatedTables: pivotRelationships.map(
          ({ relatedTable }) => relatedTable,
        ),
        isController: false,
        descriptionPrefix: 'Get the related',
      });
    } else if (hasOne.length > 0) {
      generateRelationshipMethods({
        relatedTables: hasOne,
        isController: false,
        descriptionPrefix: 'Get the related',
        isHasOne: true,
      });
    } else if (hasMany.length > 0) {
      generateRelationshipMethods({
        relatedTables: hasMany,
        isController: false,
        descriptionPrefix: 'Get the related',
      });
    }

    columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const foreignTablePrimaryKey = column.column_name;
        const description = `Find ${className} by ${foreignTablePrimaryKey}.`;
        const methodName = `findBy${toPascalCase(foreignTablePrimaryKey)}`;

        // Check if the method is already generated
        if (generatedMethods.has(methodName)) return; // Skip if already generated
        generatedMethods.add(methodName); // Mark as generated

        const returnType = `?${className}`;
        const body = `return $this->model->where('${foreignTablePrimaryKey}', $${foreignTablePrimaryKey})->first();`;

        methods += generateMethod({
          description,
          returnType,
          methodName,
          body,
          paramName: foreignTablePrimaryKey,
        });
      }
    });
  }

  /* Handle controller method generation */
  if (fileToGenerate === 'controllerMethod') {
    if (pivotRelationships.length > 0) {
      generateRelationshipMethods({
        relatedTables: pivotRelationships.map(
          ({ relatedTable }) => relatedTable,
        ),
        isController: true,
        descriptionPrefix: 'Get all',
      });
    } else if (hasOne.length > 0) {
      generateRelationshipMethods({
        relatedTables: hasOne,
        isController: true,
        descriptionPrefix: 'Get the related',
        isHasOne: true,
      });
    } else if (hasMany.length > 0) {
      generateRelationshipMethods({
        relatedTables: hasMany,
        isController: true,
        descriptionPrefix: 'Get all',
      });
    }
  }

  /* Handle route generation */
  if (fileToGenerate === 'routes') {
    if (pivotRelationships.length > 0) {
      methods += pivotRelationships
        .map(
          ({ relatedTable }) =>
            `Route::get('${convertToUrlFormat(`${tablePlural}/{id}/${getTablePlural({ tableName: relatedTable })}`)}', [${className}Controller::class, 'get${toPascalCase(
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
            `Route::get('${convertToUrlFormat(`${tablePlural}/{id}/${getTablePlural({ tableName: relatedTable })}`)}', [${className}Controller::class, 'get${toPascalCase(
              relatedTable,
            )}s']);`,
        )
        .join('\n');
    }
  }

  return methods;
};
