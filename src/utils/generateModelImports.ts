import { toPascalCase } from '@/helpers/toPascalCase';
import { ISchemaInfo } from '@/interfaces/interfaces';

export const generateModelImports = (schemaInfo: ISchemaInfo): string => {
  const imports = new Set<string>();
  const { hasOne, hasMany, columnsInfo } = schemaInfo;

  // Collect unique import statements for related models
  [...hasOne, ...hasMany].forEach((relatedTable) => {
    const relatedClass = toPascalCase(relatedTable);
    imports.add(`use App\\Models\\${relatedClass};`);
  });

  columnsInfo.forEach((column) => {
    if (column.foreign_key) {
      const relatedClass = toPascalCase(column.foreign_key.foreign_table_name);
      imports.add(`use App\\Models\\${relatedClass};`);
    }
  });

  return Array.from(imports).join('\n');
};
