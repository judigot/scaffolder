import { convertToUrlFormat } from '@/helpers/stringHelper';
import { ISchemaInfo, IColumnInfo } from '@/interfaces/interfaces';
import { changeCase } from '@/utils/identifySchema';

export const generateModelSpecificMethods = ({
  targetTable,
  schemaInfo,
  fileToGenerate,
}: {
  targetTable: ISchemaInfo['table'];
  schemaInfo: ISchemaInfo[];
  fileToGenerate: 'interface' | 'repository' | 'controllerMethod' | 'routes';
}): string => {
  // Retrieve the schema information for the target table
  const tableInfo = schemaInfo.find((table) => table.table === targetTable);
  if (!tableInfo) return '';

  const {
    table,
    tableCases,
    pivotRelationships,
    columnsInfo,
    hasOne,
    hasMany,
  } = tableInfo;

  const className = changeCase(table).pascalCase;

  const hasPivotRelationships = pivotRelationships.length > 0;
  const hasOneRelationship = hasOne.length > 0;
  const hasManyRelationship = hasMany.length > 0;

  const findPrimaryKey = (columnsInfo: IColumnInfo[]) => {
    const primaryKeyColumn = columnsInfo.find((column) => column.primary_key);

    if (!primaryKeyColumn) {
      throw new Error('Primary key not found in the provided columns.');
    }

    return primaryKeyColumn.column_name;
  };

  const primaryKey = findPrimaryKey(columnsInfo);

  // Helper function to generate method code
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
    const params = isController
      ? `(Request $request, int $${paramName})`
      : `(int $${paramName}, ?string $column = null, string $direction = 'asc')`;

    const returnTypeDeclaration = returnType != null ? `: ${returnType}` : '';

    const methodBody = fileToGenerate === 'interface' ? ';' : `{\n${body}\n}`;

    const returnTypeComment = returnType != null ? `@return ${returnType}` : '';

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
  const generatedMethods = new Set<string>();

  // Function to get the plural form of a table name
  const getTablePlural = ({ tableName }: { tableName: string }): string => {
    const relatedSchema = schemaInfo.find(
      (schema) => schema.table === tableName,
    );
    return relatedSchema ? relatedSchema.tableCases.plural : tableName;
  };

  // Function to generate methods for different types of relationships
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
      const relatedClass = changeCase(relatedTable).pascalCase;
      const relatedTablePlural = getTablePlural({ tableName: relatedTable });
      const relatedTableName = isHasOne ? relatedTable : relatedTablePlural;

      const description = `${descriptionPrefix} ${relatedClass}${
        !isHasOne ? 's' : ''
      }${isController ? ` related to the given ${className}.` : '.'}`;

      const methodName = `get${relatedClass}${!isHasOne ? 's' : ''}`;

      if (generatedMethods.has(methodName)) return;
      generatedMethods.add(methodName);

      const returnType = isController
        ? null
        : isHasOne
          ? `?${relatedClass}`
          : `?Collection`;

      let methodBody = '';
      if (isController) {
        if (!isHasOne) {
          methodBody += `
            // Extract optional URL parameters
            $column = $request->input('column', null); // Default to null if no column is provided
            $direction = $request->input('direction', 'asc'); // Default to 'asc' if no direction is provided
          `;
        }
        methodBody += `
          // Fetch the ${relatedTableName} from the repository
          $${relatedTableName} = $this->repository->get${relatedClass}${
            !isHasOne ? 's' : ''
          }($${primaryKey}${!isHasOne ? ', $column, $direction' : ''});
          return response()->json($${relatedTableName});
        `;
      } else {
        if (isHasOne) {
          methodBody = `return $this->model->find($${primaryKey})?->${relatedTableName};`;
        } else {
          const modelVar = changeCase(relatedTable).camelCase;
          methodBody = `
            $${modelVar}Model = new ${relatedClass}();
            $query = $this->model->find($${primaryKey})?->${
              changeCase(relatedTableName).camelCase
            }();
            $column = $column ?? $${modelVar}Model->getKeyName();
            $query->orderBy($column, $direction);
            return $query ? $query->get() : null;
          `;
        }
      }

      methods += generateMethod({
        description,
        returnType,
        methodName,
        body: methodBody,
        paramName: primaryKey,
        isController,
      });
    });
  };

  // Generate methods based on the file type
  if (fileToGenerate === 'repository' || fileToGenerate === 'interface') {
    if (hasPivotRelationships) {
      generateRelationshipMethods({
        relatedTables: pivotRelationships.map(
          ({ relatedTable }) => relatedTable,
        ),
        isController: false,
        descriptionPrefix: 'Get the related',
      });
    } else if (hasOneRelationship) {
      generateRelationshipMethods({
        relatedTables: hasOne,
        isController: false,
        descriptionPrefix: 'Get the related',
        isHasOne: true,
      });
    } else if (hasManyRelationship) {
      generateRelationshipMethods({
        relatedTables: hasMany,
        isController: false,
        descriptionPrefix: 'Get the related',
      });
    }

    // Generate methods for foreign key columns
    columnsInfo.forEach((column) => {
      if (column.foreign_key) {
        const foreignKey = column.column_name;
        const description = `Find ${className} by ${foreignKey}.`;
        const methodName = `findBy${changeCase(foreignKey).pascalCase}`;

        if (generatedMethods.has(methodName)) return;
        generatedMethods.add(methodName);

        const returnType = `?${className}`;
        const body = `return $this->model->where('${foreignKey}', $${foreignKey})->first();`;

        methods += generateMethod({
          description,
          returnType,
          methodName,
          body,
          paramName: foreignKey,
        });
      }
    });
  }

  if (fileToGenerate === 'controllerMethod') {
    if (hasPivotRelationships) {
      generateRelationshipMethods({
        relatedTables: pivotRelationships.map(
          ({ relatedTable }) => relatedTable,
        ),
        isController: true,
        descriptionPrefix: 'Get all',
      });
    } else if (hasOneRelationship) {
      generateRelationshipMethods({
        relatedTables: hasOne,
        isController: true,
        descriptionPrefix: 'Get the related',
        isHasOne: true,
      });
    } else if (hasManyRelationship) {
      generateRelationshipMethods({
        relatedTables: hasMany,
        isController: true,
        descriptionPrefix: 'Get all',
      });
    }
  }

  if (fileToGenerate === 'routes') {
    const generatedRoutes = new Set<string>();

    const generateRoutes = (relatedTables: string[], isHasOne: boolean) => {
      relatedTables.forEach((relatedTable) => {
        const route = convertToUrlFormat(
          `${tableCases.plural}/{id}/${
            isHasOne
              ? relatedTable
              : getTablePlural({ tableName: relatedTable })
          }`,
        );

        if (generatedRoutes.has(route)) return;
        generatedRoutes.add(route);

        methods += `Route::get('${route}', [${className}Controller::class, 'get${
          changeCase(relatedTable).pascalCase
        }${!isHasOne ? 's' : ''}']);\n        `;
      });
    };

    if (hasPivotRelationships) {
      generateRoutes(
        pivotRelationships.map(({ relatedTable }) => relatedTable),
        false,
      );
    } else if (hasOneRelationship) {
      generateRoutes(hasOne, true);
    } else if (hasManyRelationship) {
      generateRoutes(hasMany, false);
    }
  }

  return methods;
};
