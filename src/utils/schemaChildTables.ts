import type { ISchemaInfo } from "@/interfaces/interfaces.ts";

const buildForeignKeyChildTableMap = (
	schemaInfo: ISchemaInfo[],
): Map<string, string[]> => {
	const childTableMap = new Map<string, string[]>();

	for (const table of schemaInfo) {
		for (const column of table.columnsInfo) {
			const parentTable = column.foreign_key?.foreign_table_name;
			if (typeof parentTable === "string" && parentTable.length > 0) {
				const existingChildren = childTableMap.get(parentTable) ?? [];
				if (!existingChildren.includes(table.tableName)) {
					existingChildren.push(table.tableName);
					childTableMap.set(parentTable, existingChildren);
				}
			}
		}
	}

	return childTableMap;
};

export const buildChildTableMap = (
	schemaInfo: ISchemaInfo[],
): Map<string, string[]> => buildForeignKeyChildTableMap(schemaInfo);

export const getCombinedChildTables = (
	table: ISchemaInfo,
	childTableMap: Map<string, string[]>,
): string[] => {
	const combined = new Set<string>(table.childTables ?? []);
	const inferredChildren = childTableMap.get(table.tableName);
	if (inferredChildren) {
		for (const child of inferredChildren) {
			combined.add(child);
		}
	}
	return Array.from(combined);
};
