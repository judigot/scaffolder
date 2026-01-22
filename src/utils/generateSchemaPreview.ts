import type { IStructure, IFile } from "@/components/FileViewer.tsx";
import type { ISchemaInfo } from "@/interfaces/interfaces.ts";
import { changeCase } from "@/utils/common.ts";

/**
 * Generates a preview file structure from schemaInfo for use with FileViewer.
 * This creates a basic project structure without needing YAML templates.
 */
export function generateSchemaPreview(schemaInfo: ISchemaInfo[]): IStructure {
	const files: (IFile | { type: "folder"; name: string; children: IFile[] })[] = [];

	// Generate TypeScript interfaces
	const interfacesContent = generateTypescriptInterfacesPreview(schemaInfo);

	// Generate SQL schema
	const sqlContent = generateSQLSchemaPreview(schemaInfo);

	// Generate a summary README
	const summaryContent = generateSchemaSummary(schemaInfo);

	// Create src folder with interfaces
	files.push({
		type: "folder",
		name: "src",
		children: [
			{
				type: "file",
				name: "interfaces.ts",
				content: interfacesContent,
			},
		],
	});

	// Create database folder with SQL
	files.push({
		type: "folder",
		name: "database",
		children: [
			{
				type: "file",
				name: "schema.sql",
				content: sqlContent,
			},
		],
	});

	// Add README at root
	files.push({
		type: "file",
		name: "README.md",
		content: summaryContent,
	});

	return files;
}

/**
 * Generates TypeScript interfaces from schemaInfo
 */
function generateTypescriptInterfacesPreview(schemaInfo: ISchemaInfo[]): string {
	const interfaces = schemaInfo.map((table) => {
		const interfaceName = changeCase(table.tableName, "PascalCase");
		const properties = table.columnsInfo
			.map((col) => {
				const tsType = mapDataTypeToTypescript(col.data_type);
				const nullable = col.is_nullable === "YES" ? " | null" : "";
				return `  ${col.column_name}: ${tsType}${nullable};`;
			})
			.join("\n");

		return `export interface I${interfaceName} {\n${properties}\n}`;
	});

	return `// Auto-generated TypeScript interfaces\n// Generated from your app schema\n\n${interfaces.join("\n\n")}\n`;
}

/**
 * Maps schemaInfo data types to TypeScript types
 */
function mapDataTypeToTypescript(dataType: string): string {
	const typeMap: Record<string, string> = {
		string: "string",
		number: "number",
		boolean: "boolean",
		Date: "Date",
		object: "Record<string, unknown>",
	};
	return typeMap[dataType] ?? "unknown";
}

/**
 * Generates SQL schema preview from schemaInfo
 */
function generateSQLSchemaPreview(schemaInfo: ISchemaInfo[]): string {
	const tables = schemaInfo.map((table) => {
		const columns = table.columnsInfo
			.map((col) => {
				const sqlType = mapDataTypeToSQL(col.data_type);
				const nullable = col.is_nullable === "NO" ? " NOT NULL" : "";
				const primaryKey = col.primary_key ? " PRIMARY KEY" : "";
				const unique = col.unique ? " UNIQUE" : "";
				const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : "";

				return `  "${col.column_name}" ${sqlType}${nullable}${primaryKey}${unique}${defaultVal}`;
			})
			.join(",\n");

		// Add foreign key constraints
		const foreignKeys = table.columnsInfo
			.filter((col) => col.foreign_key)
			.map((col) => {
				const fk = col.foreign_key;
				return `  FOREIGN KEY ("${col.column_name}") REFERENCES "${fk?.foreign_table_name}"("${fk?.foreign_column_name}")`;
			});

		const allConstraints = foreignKeys.length > 0 ? `,\n${foreignKeys.join(",\n")}` : "";

		return `CREATE TABLE "${table.tableName}" (\n${columns}${allConstraints}\n);`;
	});

	return `-- Auto-generated SQL Schema\n-- Generated from your app schema\n\n${tables.join("\n\n")}\n`;
}

/**
 * Maps schemaInfo data types to SQL types
 */
function mapDataTypeToSQL(dataType: string): string {
	const typeMap: Record<string, string> = {
		string: "VARCHAR(255)",
		number: "INTEGER",
		boolean: "BOOLEAN",
		Date: "TIMESTAMP",
		object: "JSONB",
	};
	return typeMap[dataType] ?? "TEXT";
}

/**
 * Generates a human-readable summary of the schema
 */
function generateSchemaSummary(schemaInfo: ISchemaInfo[]): string {
	const tableList = schemaInfo
		.map((table) => {
			const columnCount = table.columnsInfo.length;
			const relationships: string[] = [];

			if (table.hasOne?.length) {
				relationships.push(`has one: ${table.hasOne.join(", ")}`);
			}
			if (table.hasMany?.length) {
				relationships.push(`has many: ${table.hasMany.join(", ")}`);
			}
			if (table.belongsTo?.length) {
				relationships.push(`belongs to: ${table.belongsTo.join(", ")}`);
			}
			if (table.belongsToMany?.length) {
				relationships.push(`belongs to many: ${table.belongsToMany.join(", ")}`);
			}

			const relText = relationships.length > 0 ? `\n  - ${relationships.join("\n  - ")}` : "";

			return `- **${table.tableName}** (${columnCount} columns)${relText}`;
		})
		.join("\n");

	return `# App Schema Summary

## Tables

${tableList}

## Total

- ${schemaInfo.length} table(s)
- ${schemaInfo.reduce((acc, t) => acc + t.columnsInfo.length, 0)} column(s)
`;
}
