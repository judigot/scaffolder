import type { ISchemaInfo } from "@/interfaces/interfaces.ts";
import { isSchemaInfoAlreadySorted } from "@/utils/isSchemaInfoAlreadySorted.ts";
import {
	buildChildTableMap,
	getCombinedChildTables,
} from "@/utils/schemaChildTables.ts";

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
	const childTableMap = buildChildTableMap(schemaInfo);

	const visit = (table: ISchemaInfo) => {
		if (visited.has(table.tableName)) {
			return;
		}
		visited.add(table.tableName);

		const childTables = getCombinedChildTables(table, childTableMap);
		for (const childTable of childTables) {
			const childRelationship = schemaInfo.find(
				(r) => r.tableName === childTable,
			);
			if (childRelationship) {
				visit(childRelationship);
			}
		}

		sorted.push(table);
	};

	for (const table of schemaInfo) {
		visit(table);
	}

	return sorted.reverse();
};
