import { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { isSchemaInfoAlreadySorted } from '@/utils/isSchemaInfoAlreadySorted.ts';

/*
  Sort tables topologically, so that parent tables appear before child tables.
*/
export const sortTablesBasedOnHierarchy = (
  schemaInfo: ISchemaInfo[],
): ISchemaInfo[] => {
  if (isSchemaInfoAlreadySorted(schemaInfo)) {
    return schemaInfo; /* Return original if already sorted */
  }

  const sorted: ISchemaInfo[] = [];
  const visited = new Set<string>();

  const visit = (table: ISchemaInfo) => {
    if (visited.has(table.tableName)) {
      return;
    }
    visited.add(table.tableName);

    if (table.childTables != null) {
      table.childTables.forEach((childTable) => {
        const childRelationship = schemaInfo.find(
          (r) => r.tableName === childTable,
        );
        if (childRelationship) {
          visit(childRelationship);
        }
      });
    }

    sorted.push(table);
  };

  schemaInfo.forEach((table) => {
    visit(table);
  });

  return sorted.reverse();
};
