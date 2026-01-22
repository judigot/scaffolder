import { z } from "zod";

/**
 * Zod schema for validating foreign key references
 */
const foreignKeySchema = z.object({
	foreign_table_name: z.string().min(1, "Foreign table name is required"),
	foreign_column_name: z.string().min(1, "Foreign column name is required"),
});

/**
 * Zod schema for validating column information
 */
const columnInfoSchema = z.object({
	column_name: z
		.string()
		.min(1, "Column name is required")
		.regex(/^[a-z][a-z0-9_]*$/, "Column name must be snake_case"),
	data_type: z.enum(["string", "number", "boolean", "Date", "object"], {
		errorMap: () => ({
			message: "Data type must be: string, number, boolean, Date, or object",
		}),
	}),
	is_nullable: z.enum(["YES", "NO"], {
		errorMap: () => ({ message: "is_nullable must be 'YES' or 'NO'" }),
	}),
	column_default: z.string().nullable().optional(),
	primary_key: z.literal(true).optional(),
	unique: z.literal(true).optional(),
	foreign_key: foreignKeySchema.optional(),
});

/**
 * Zod schema for validating pivot relationships
 */
const pivotRelationshipSchema = z.object({
	relatedTable: z.string().min(1, "Related table name is required"),
	pivotTable: z.string().min(1, "Pivot table name is required"),
});

/**
 * Zod schema for validating a single table in the schema
 */
const schemaInfoSchema = z
	.object({
		tableName: z
			.string()
			.min(1, "Table name is required")
			.regex(/^[a-z][a-z0-9_]*$/, "Table name must be snake_case"),
		columnsInfo: z
			.array(columnInfoSchema)
			.min(1, "At least one column is required"),
		data: z.array(z.record(z.string(), z.unknown())).optional(),
		requiredColumns: z.array(z.string()).optional(),
		foreignKeys: z.array(z.string()).optional(),
		viewQuery: z.string().optional(),
		viewStructure: z.array(z.string()).optional(),
		foreignTables: z.array(z.string()).optional(),
		childTables: z.array(z.string()).optional(),
		isPivot: z.literal(true).optional(),
		hasOne: z.array(z.string()).optional(),
		hasMany: z.array(z.string()).optional(),
		belongsTo: z.array(z.string()).optional(),
		belongsToMany: z.array(z.string()).optional(),
		pivotRelationships: z.array(pivotRelationshipSchema).optional(),
	})
	.refine(
		(table) => {
			// Ensure at least one column is marked as primary key
			const hasPrimaryKey = table.columnsInfo.some((col) => col.primary_key);
			return hasPrimaryKey;
		},
		{ message: "Each table must have at least one primary key column" }
	)
	.refine(
		(table) => {
			// Ensure id column exists (convention)
			const hasIdColumn = table.columnsInfo.some(
				(col) => col.column_name === "id"
			);
			return hasIdColumn;
		},
		{ message: "Each table should have an 'id' column" }
	);

/**
 * Zod schema for validating the complete schemaInfo array
 */
export const schemaInfoArraySchema = z
	.array(schemaInfoSchema)
	.min(1, "Schema must contain at least one table")
	.refine(
		(tables) => {
			// Check for duplicate table names
			const tableNames = tables.map((t) => t.tableName);
			const uniqueNames = new Set(tableNames);
			return tableNames.length === uniqueNames.size;
		},
		{ message: "Duplicate table names found in schema" }
	)
	.refine(
		(tables) => {
			// Validate foreign key references point to existing tables
			const tableNames = new Set(tables.map((t) => t.tableName));
			for (const table of tables) {
				for (const col of table.columnsInfo) {
					if (col.foreign_key) {
						if (!tableNames.has(col.foreign_key.foreign_table_name)) {
							return false;
						}
					}
				}
			}
			return true;
		},
		{ message: "Foreign key references a non-existent table" }
	)
	.refine(
		(tables) => {
			// Validate relationship references point to existing tables
			const tableNames = new Set(tables.map((t) => t.tableName));
			for (const table of tables) {
				const relationships = [
					...(table.hasOne ?? []),
					...(table.hasMany ?? []),
					...(table.belongsTo ?? []),
					...(table.belongsToMany ?? []),
					...(table.foreignTables ?? []),
					...(table.childTables ?? []),
				];
				for (const ref of relationships) {
					if (!tableNames.has(ref)) {
						return false;
					}
				}
			}
			return true;
		},
		{ message: "Relationship references a non-existent table" }
	);

export type SchemaInfoArray = z.infer<typeof schemaInfoArraySchema>;
export type SchemaInfo = z.infer<typeof schemaInfoSchema>;
export type ColumnInfo = z.infer<typeof columnInfoSchema>;

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
	success: boolean;
	data?: SchemaInfoArray;
	errors?: {
		path: string;
		message: string;
	}[];
}

/**
 * Validates a schemaInfo array and returns detailed results
 */
export function validateSchemaInfo(data: unknown): ValidationResult {
	const result = schemaInfoArraySchema.safeParse(data);

	if (result.success) {
		return {
			success: true,
			data: result.data,
		};
	}

	// Zod 4 uses result.error.issues instead of result.error.errors
	const issues = result.error?.issues ?? result.error?.errors ?? [];
	return {
		success: false,
		errors: Array.isArray(issues)
			? issues.map((err: { path?: (string | number)[]; message?: string }) => ({
					path: Array.isArray(err.path) ? err.path.join(".") : "",
					message: err.message ?? "Validation error",
				}))
			: [{ path: "", message: "Validation failed" }],
	};
}

/**
 * Parses and validates schemaInfo from a JSON string
 */
export function parseAndValidateSchemaInfo(jsonString: string): ValidationResult {
	try {
		const parsed = JSON.parse(jsonString);
		return validateSchemaInfo(parsed);
	} catch {
		return {
			success: false,
			errors: [{ path: "", message: "Invalid JSON format" }],
		};
	}
}

/**
 * Extracts schemaInfo JSON from AI response text
 * Looks for hidden HTML comments first, then falls back to code blocks
 */
export function extractSchemaInfoFromResponse(
	responseText: string
): string | null {
	// Primary: Match hidden HTML comment format <!--schemaInfo:[...]-->
	const hiddenSchemaRegex = /<!--schemaInfo:([\s\S]*?)-->/;
	const hiddenMatch = responseText.match(hiddenSchemaRegex);

	if (hiddenMatch?.[1]) {
		return hiddenMatch[1].trim();
	}

	// Fallback 1: Match ```json:schemaInfo ... ``` blocks
	const schemaInfoRegex = /```json:schemaInfo\s*([\s\S]*?)```/;
	const match = responseText.match(schemaInfoRegex);

	if (match?.[1]) {
		return match[1].trim();
	}

	// Fallback 2: try to match regular ```json blocks that contain schemaInfo-like content
	const jsonRegex = /```json\s*([\s\S]*?)```/;
	const jsonMatch = responseText.match(jsonRegex);

	if (jsonMatch?.[1]) {
		const content = jsonMatch[1].trim();
		// Check if it looks like a schemaInfo array
		if (content.startsWith("[") && content.includes("tableName")) {
			return content;
		}
	}

	return null;
}

/**
 * Removes hidden schemaInfo comments from text for display
 */
export function removeHiddenSchemaFromText(text: string): string {
	return text.replace(/<!--schemaInfo:[\s\S]*?-->/g, "").trim();
}

/**
 * Validates schemaInfo extracted from AI response
 */
export function validateSchemaInfoFromResponse(responseText: string): ValidationResult & { extracted: boolean } {
	const extracted = extractSchemaInfoFromResponse(responseText);

	if (!extracted) {
		return {
			success: false,
			extracted: false,
			errors: [{ path: "", message: "No schemaInfo JSON block found in response" }],
		};
	}

	const result = parseAndValidateSchemaInfo(extracted);
	return {
		...result,
		extracted: true,
	};
}
