import { describe, it, expect } from "vitest";
import {
	validateSchemaInfo,
	parseAndValidateSchemaInfo,
	extractSchemaInfoFromResponse,
	validateSchemaInfoFromResponse,
} from "@/utils/schemaInfoValidator.ts";

describe("schemaInfoValidator", () => {
	describe("validateSchemaInfo", () => {
		describe("valid schemas", () => {
			it("should validate a minimal valid schema", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(true);
				expect(result.data).toHaveLength(1);
			});

			it("should validate a complete schema with all fields", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "email",
								data_type: "string",
								is_nullable: "NO",
								unique: true,
							},
							{
								column_name: "name",
								data_type: "string",
								is_nullable: "YES",
							},
							{
								column_name: "created_at",
								data_type: "Date",
								is_nullable: "NO",
							},
						],
						hasMany: ["posts"],
						childTables: ["posts"],
					},
					{
						tableName: "posts",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "user_id",
								data_type: "number",
								is_nullable: "NO",
								foreign_key: {
									foreign_table_name: "users",
									foreign_column_name: "id",
								},
							},
							{
								column_name: "title",
								data_type: "string",
								is_nullable: "NO",
							},
							{
								column_name: "content",
								data_type: "string",
								is_nullable: "YES",
							},
							{
								column_name: "published",
								data_type: "boolean",
								is_nullable: "NO",
								column_default: "false",
							},
						],
						foreignTables: ["users"],
						belongsTo: ["users"],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(true);
				expect(result.data).toHaveLength(2);
			});

			it("should validate a schema with many-to-many relationships", () => {
				const schema = [
					{
						tableName: "posts",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
						belongsToMany: ["tags"],
						pivotRelationships: [
							{ relatedTable: "tags", pivotTable: "post_tags" },
						],
					},
					{
						tableName: "tags",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "name",
								data_type: "string",
								is_nullable: "NO",
							},
						],
						belongsToMany: ["posts"],
					},
					{
						tableName: "post_tags",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "post_id",
								data_type: "number",
								is_nullable: "NO",
								foreign_key: {
									foreign_table_name: "posts",
									foreign_column_name: "id",
								},
							},
							{
								column_name: "tag_id",
								data_type: "number",
								is_nullable: "NO",
								foreign_key: {
									foreign_table_name: "tags",
									foreign_column_name: "id",
								},
							},
						],
						isPivot: true,
						foreignTables: ["posts", "tags"],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(true);
				expect(result.data).toHaveLength(3);
			});

			it("should validate all supported data types", () => {
				const schema = [
					{
						tableName: "test_types",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{ column_name: "text_field", data_type: "string", is_nullable: "YES" },
							{ column_name: "num_field", data_type: "number", is_nullable: "YES" },
							{ column_name: "bool_field", data_type: "boolean", is_nullable: "YES" },
							{ column_name: "date_field", data_type: "Date", is_nullable: "YES" },
							{ column_name: "json_field", data_type: "object", is_nullable: "YES" },
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(true);
			});

			it("should validate schema with view tables", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
					{
						tableName: "user_stats_view",
						viewQuery: "SELECT user_id, COUNT(*) FROM posts GROUP BY user_id",
						viewStructure: ["users", "posts"],
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(true);
			});

			it("should validate schema with seed data", () => {
				const schema = [
					{
						tableName: "roles",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "name",
								data_type: "string",
								is_nullable: "NO",
							},
						],
						data: [
							{ id: 1, name: "admin" },
							{ id: 2, name: "user" },
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(true);
			});
		});

		describe("invalid schemas", () => {
			it("should reject empty schema array", () => {
				const result = validateSchemaInfo([]);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("at least one table");
				}
			});

			it("should reject non-array input", () => {
				const result = validateSchemaInfo({ tableName: "test" });
				expect(result.success).toBe(false);
			});

			it("should reject table without id column", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "email",
								data_type: "string",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("id");
				}
			});

			it("should reject table without primary key", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								// missing primary_key: true
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("primary key");
				}
			});

			it("should reject invalid table name (camelCase)", () => {
				const schema = [
					{
						tableName: "userProfiles", // should be snake_case
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("snake_case");
				}
			});

			it("should reject invalid column name (camelCase)", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "firstName", // should be first_name
								data_type: "string",
								is_nullable: "YES",
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("snake_case");
				}
			});

			it("should reject invalid data type", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "age",
								data_type: "integer", // should be "number"
								is_nullable: "YES",
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				// Zod 4 error message format
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toMatch(/string|number|boolean|Date|object|Invalid/i);
				}
			});

			it("should reject invalid is_nullable value", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "name",
								data_type: "string",
								is_nullable: true, // should be "YES" or "NO"
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
			});

			it("should reject duplicate table names", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
					{
						tableName: "users", // duplicate
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("Duplicate");
				}
			});

			it("should reject foreign key to non-existent table", () => {
				const schema = [
					{
						tableName: "posts",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "user_id",
								data_type: "number",
								is_nullable: "NO",
								foreign_key: {
									foreign_table_name: "users", // doesn't exist
									foreign_column_name: "id",
								},
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("non-existent table");
				}
			});

			it("should reject hasMany reference to non-existent table", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
						],
						hasMany: ["posts"], // posts table doesn't exist
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				if (result.errors?.[0]) {
					expect(result.errors[0].message).toContain("non-existent table");
				}
			});

			it("should reject table without any columns", () => {
				const schema = [
					{
						tableName: "empty_table",
						columnsInfo: [],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
				// Match case-insensitive
				if (result.errors?.[0]) {
					expect(result.errors[0].message.toLowerCase()).toContain("at least one column");
				}
			});

			it("should reject column name starting with number", () => {
				const schema = [
					{
						tableName: "users",
						columnsInfo: [
							{
								column_name: "id",
								data_type: "number",
								is_nullable: "NO",
								primary_key: true,
							},
							{
								column_name: "1st_name", // starts with number
								data_type: "string",
								is_nullable: "YES",
							},
						],
					},
				];

				const result = validateSchemaInfo(schema);
				expect(result.success).toBe(false);
			});
		});
	});

	describe("parseAndValidateSchemaInfo", () => {
		it("should parse and validate valid JSON string", () => {
			const jsonString = JSON.stringify([
				{
					tableName: "users",
					columnsInfo: [
						{
							column_name: "id",
							data_type: "number",
							is_nullable: "NO",
							primary_key: true,
						},
					],
				},
			]);

			const result = parseAndValidateSchemaInfo(jsonString);
			expect(result.success).toBe(true);
		});

		it("should reject invalid JSON string", () => {
			const result = parseAndValidateSchemaInfo("not valid json {");
			expect(result.success).toBe(false);
			if (result.errors?.[0]) {
				expect(result.errors[0].message).toContain("Invalid JSON");
			}
		});

		it("should reject valid JSON but invalid schema", () => {
			const result = parseAndValidateSchemaInfo('{"not": "a schema"}');
			expect(result.success).toBe(false);
		});
	});

	describe("extractSchemaInfoFromResponse", () => {
		it("should extract schemaInfo from json:schemaInfo code block", () => {
			const response = `
Here's your schema:

\`\`\`json:schemaInfo
[{"tableName": "users", "columnsInfo": []}]
\`\`\`

This schema includes a users table.
			`;

			const extracted = extractSchemaInfoFromResponse(response);
			expect(extracted).toBe('[{"tableName": "users", "columnsInfo": []}]');
		});

		it("should extract schemaInfo from regular json code block", () => {
			const response = `
Here's your schema:

\`\`\`json
[{"tableName": "posts", "columnsInfo": []}]
\`\`\`
			`;

			const extracted = extractSchemaInfoFromResponse(response);
			expect(extracted).toBe('[{"tableName": "posts", "columnsInfo": []}]');
		});

		it("should return null if no schema found", () => {
			const response = "This response has no schema in it.";
			const extracted = extractSchemaInfoFromResponse(response);
			expect(extracted).toBeNull();
		});

		it("should prefer json:schemaInfo over regular json block", () => {
			const response = `
\`\`\`json
{"not": "schemaInfo"}
\`\`\`

\`\`\`json:schemaInfo
[{"tableName": "correct", "columnsInfo": []}]
\`\`\`
			`;

			const extracted = extractSchemaInfoFromResponse(response);
			expect(extracted).toContain("correct");
		});

		it("should handle multiline JSON in code block", () => {
			const response = `
\`\`\`json:schemaInfo
[
  {
    "tableName": "users",
    "columnsInfo": [
      {
        "column_name": "id",
        "data_type": "number"
      }
    ]
  }
]
\`\`\`
			`;

			const extracted = extractSchemaInfoFromResponse(response);
			expect(extracted).not.toBeNull();
			if (extracted !== null) {
				expect(JSON.parse(extracted)).toHaveLength(1);
			}
		});
	});

	describe("validateSchemaInfoFromResponse", () => {
		it("should extract, parse and validate valid response", () => {
			const response = `
Here's your schema:

\`\`\`json:schemaInfo
[{
  "tableName": "users",
  "columnsInfo": [{
    "column_name": "id",
    "data_type": "number",
    "is_nullable": "NO",
    "primary_key": true
  }]
}]
\`\`\`
			`;

			const result = validateSchemaInfoFromResponse(response);
			expect(result.extracted).toBe(true);
			expect(result.success).toBe(true);
		});

		it("should report extraction failure", () => {
			const response = "No schema here";
			const result = validateSchemaInfoFromResponse(response);
			expect(result.extracted).toBe(false);
			expect(result.success).toBe(false);
		});

		it("should report validation failure after successful extraction", () => {
			const response = `
\`\`\`json:schemaInfo
[{"tableName": "BadName", "columnsInfo": []}]
\`\`\`
			`;

			const result = validateSchemaInfoFromResponse(response);
			expect(result.extracted).toBe(true);
			expect(result.success).toBe(false);
		});
	});

	describe("real-world AI response scenarios", () => {
		it("should validate typical e-commerce schema from AI", () => {
			const schema = [
				{
					tableName: "users",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{ column_name: "email", data_type: "string", is_nullable: "NO", unique: true },
						{ column_name: "password", data_type: "string", is_nullable: "NO" },
						{ column_name: "name", data_type: "string", is_nullable: "YES" },
						{ column_name: "created_at", data_type: "Date", is_nullable: "NO" },
						{ column_name: "updated_at", data_type: "Date", is_nullable: "NO" },
					],
					hasMany: ["orders"],
					childTables: ["orders"],
				},
				{
					tableName: "products",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{ column_name: "name", data_type: "string", is_nullable: "NO" },
						{ column_name: "description", data_type: "string", is_nullable: "YES" },
						{ column_name: "price", data_type: "number", is_nullable: "NO" },
						{ column_name: "stock", data_type: "number", is_nullable: "NO", column_default: "0" },
						{ column_name: "created_at", data_type: "Date", is_nullable: "NO" },
					],
					hasMany: ["order_items"],
					childTables: ["order_items"],
				},
				{
					tableName: "orders",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{
							column_name: "user_id",
							data_type: "number",
							is_nullable: "NO",
							foreign_key: { foreign_table_name: "users", foreign_column_name: "id" },
						},
						{ column_name: "status", data_type: "string", is_nullable: "NO", column_default: "'pending'" },
						{ column_name: "total", data_type: "number", is_nullable: "NO" },
						{ column_name: "created_at", data_type: "Date", is_nullable: "NO" },
					],
					foreignTables: ["users"],
					belongsTo: ["users"],
					hasMany: ["order_items"],
					childTables: ["order_items"],
				},
				{
					tableName: "order_items",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{
							column_name: "order_id",
							data_type: "number",
							is_nullable: "NO",
							foreign_key: { foreign_table_name: "orders", foreign_column_name: "id" },
						},
						{
							column_name: "product_id",
							data_type: "number",
							is_nullable: "NO",
							foreign_key: { foreign_table_name: "products", foreign_column_name: "id" },
						},
						{ column_name: "quantity", data_type: "number", is_nullable: "NO" },
						{ column_name: "price", data_type: "number", is_nullable: "NO" },
					],
					foreignTables: ["orders", "products"],
					belongsTo: ["orders", "products"],
				},
			];

			const result = validateSchemaInfo(schema);
			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(4);
		});

		it("should validate blog schema with tags (many-to-many)", () => {
			const schema = [
				{
					tableName: "users",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{ column_name: "username", data_type: "string", is_nullable: "NO", unique: true },
						{ column_name: "email", data_type: "string", is_nullable: "NO", unique: true },
					],
					hasMany: ["posts"],
					childTables: ["posts"],
				},
				{
					tableName: "posts",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{
							column_name: "user_id",
							data_type: "number",
							is_nullable: "NO",
							foreign_key: { foreign_table_name: "users", foreign_column_name: "id" },
						},
						{ column_name: "title", data_type: "string", is_nullable: "NO" },
						{ column_name: "content", data_type: "string", is_nullable: "YES" },
						{ column_name: "published", data_type: "boolean", is_nullable: "NO", column_default: "false" },
					],
					foreignTables: ["users"],
					belongsTo: ["users"],
					belongsToMany: ["tags"],
					pivotRelationships: [{ relatedTable: "tags", pivotTable: "post_tags" }],
				},
				{
					tableName: "tags",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{ column_name: "name", data_type: "string", is_nullable: "NO", unique: true },
						{ column_name: "slug", data_type: "string", is_nullable: "NO", unique: true },
					],
					belongsToMany: ["posts"],
					pivotRelationships: [{ relatedTable: "posts", pivotTable: "post_tags" }],
				},
				{
					tableName: "post_tags",
					columnsInfo: [
						{ column_name: "id", data_type: "number", is_nullable: "NO", primary_key: true },
						{
							column_name: "post_id",
							data_type: "number",
							is_nullable: "NO",
							foreign_key: { foreign_table_name: "posts", foreign_column_name: "id" },
						},
						{
							column_name: "tag_id",
							data_type: "number",
							is_nullable: "NO",
							foreign_key: { foreign_table_name: "tags", foreign_column_name: "id" },
						},
					],
					isPivot: true,
					foreignTables: ["posts", "tags"],
					belongsTo: ["posts", "tags"],
				},
			];

			const result = validateSchemaInfo(schema);
			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(4);
		});
	});
});
