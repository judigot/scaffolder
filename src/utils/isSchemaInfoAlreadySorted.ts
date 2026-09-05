import type { ISchemaInfo } from "@/interfaces/interfaces.ts";
import {
	buildChildTableMap,
	getCombinedChildTables,
} from "@/utils/schemaChildTables.ts";

/*
  Check whether schemaInfo is already sorted: 
  Each table's childTables (if any) should appear only after the current table.
 */
export const isSchemaInfoAlreadySorted = (
	schemaInfo: ISchemaInfo[],
): boolean => {
	const childTableMap = buildChildTableMap(schemaInfo);
	return schemaInfo.every((relationship, index) => {
		const childTables = getCombinedChildTables(relationship, childTableMap);
		return childTables.every(
			(childTable) =>
				schemaInfo.findIndex((r) => r.tableName === childTable) > index,
		);
	});
};
