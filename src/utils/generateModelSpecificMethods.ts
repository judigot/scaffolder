import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

export const generateModelSpecificMethods = ({
  schemaInfo,
  fileToGenerate,
}: {
  schemaInfo: ISchemaInfo;
  fileToGenerate: string;
}): string => {
  const { table, hasOne, hasMany } = schemaInfo;
  const className = toPascalCase(table);

  const generateMethod = (
    description: string,
    returnType: string,
    methodName: string,
    body: string,
    isInterface: boolean,
  ) => `
    /**
     * ${description}
     *
     * @param int $id
     * @return ${returnType}
     */
    public function ${methodName}(int $id): ${returnType}${
      isInterface
        ? ';'
        : ` {
        ${body}
    }`
    }
  `;

  let methods = '';

  // Generate methods for hasOne and hasMany relationships
  const generateRelationshipsMethods = ({
    relatedTables,
    relationshipType,
    returnType,
    bodyContent,
  }: {
    relatedTables: string[];
    relationshipType: 'hasOne' | 'hasMany';
    returnType: string;
    bodyContent: (relatedTable: string) => string;
  }) => {
    relatedTables.forEach((relatedTable) => {
      const relatedClass = toPascalCase(relatedTable);
      const description = `Get the related ${relatedClass}.`;
      const methodName = `get${relatedClass}${relationshipType === 'hasMany' ? 's' : ''}`;

      methods += generateMethod(
        description,
        returnType,
        methodName,
        bodyContent(relatedTable),
        fileToGenerate === 'interface',
      );
    });
  };

  generateRelationshipsMethods({
    relatedTables: hasOne,
    relationshipType: 'hasOne',
    returnType: `?${className}`,
    bodyContent: (relatedTable) =>
      `return $this->model->find($id)?->${relatedTable};`,
  });

  generateRelationshipsMethods({
    relatedTables: hasMany,
    relationshipType: 'hasMany',
    returnType: '?Collection',
    bodyContent: (relatedTable) =>
      `return $this->model->find($id)?->${relatedTable}s;`,
  });

  // Generate methods for foreign key relationships
  schemaInfo.columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const foreignKeyName = toPascalCase(column.column_name);
      const description = `Find ${className} by ${column.column_name}.`;
      const methodName = `findBy${foreignKeyName}`;
      const returnType = `?${className}`;
      const body = `return $this->model->where('${column.column_name}', $${column.column_name})->first();`;

      methods += generateMethod(
        description,
        returnType,
        methodName,
        body,
        fileToGenerate === 'interface',
      );
    }
  });

  return methods;
};
