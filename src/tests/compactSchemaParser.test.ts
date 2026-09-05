import { describe, it, expect } from "vitest";
import {
	parseCompactSchema,
	hasCompactSchema,
	validateSchemaInfoFromResponse,
	removeHiddenSchemaFromText,
} from "@/utils/schemaInfoValidator.ts";
import { honoReactCompactSchema } from "@/tests/helpers/honoReactAgentSchema.ts";

describe("Compact Schema Parser", () => {
	describe("hasCompactSchema", () => {
		it("should detect compact schema format", () => {
			const text = `Some text
<@@SCHEMA@@>
@users:id:n#pk,email:s!u,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>
More text`;
			expect(hasCompactSchema(text)).toBe(true);
		});

		it("should return false for text without compact schema", () => {
			const text = "Just some regular text without schema";
			expect(hasCompactSchema(text)).toBe(false);
		});

		it("should return false for JSON schema format", () => {
			const text = '<!--schemaInfo:[{"tableName":"users"}]-->';
			expect(hasCompactSchema(text)).toBe(false);
		});
	});

	describe("parseCompactSchema - Basic Parsing", () => {
		it("should parse a simple single-table schema", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,email:s!u,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result).not.toBeNull();
			expect(result).toHaveLength(1);

			const users = result?.[0];
			expect(users?.tableName).toBe("users");
			expect(users?.columnsInfo).toHaveLength(5);
		});

		it("should parse column with primary key", () => {
			const text = `<@@SCHEMA@@>
@products:id:n#pk,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const idColumn = result?.[0]?.columnsInfo.find((c) => c.column_name === "id");

			expect(idColumn?.primary_key).toBe(true);
			expect(idColumn?.data_type).toBe("number");
			expect(idColumn?.is_nullable).toBe("NO");
		});

		it("should parse column with unique constraint", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,email:s!u,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const emailColumn = result?.[0]?.columnsInfo.find((c) => c.column_name === "email");

			expect(emailColumn?.unique).toBe(true);
			expect(emailColumn?.data_type).toBe("string");
		});

		it("should parse nullable column", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,bio:s?,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const bioColumn = result?.[0]?.columnsInfo.find((c) => c.column_name === "bio");

			expect(bioColumn?.is_nullable).toBe("YES");
		});

		it("should parse non-nullable column (default)", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const nameColumn = result?.[0]?.columnsInfo.find((c) => c.column_name === "name");

			expect(nameColumn?.is_nullable).toBe("NO");
		});

		it("should parse all data types correctly", () => {
			const text = `<@@SCHEMA@@>
@test:id:n#pk,str_col:s,num_col:n,bool_col:b,date_col:D,obj_col:o,uuid_col:u,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const columns = result?.[0]?.columnsInfo;

			expect(columns?.find((c) => c.column_name === "str_col")?.data_type).toBe("string");
			expect(columns?.find((c) => c.column_name === "num_col")?.data_type).toBe("number");
			expect(columns?.find((c) => c.column_name === "bool_col")?.data_type).toBe("boolean");
			expect(columns?.find((c) => c.column_name === "date_col")?.data_type).toBe("Date");
			expect(columns?.find((c) => c.column_name === "obj_col")?.data_type).toBe("object");
			expect(columns?.find((c) => c.column_name === "uuid_col")?.data_type).toBe("uuid");
		});

		it("should parse :uuid as an explicit compact uuid type", () => {
			const text = `<@@SCHEMA@@>
@user:id:uuid#pk,email:s!u,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const idColumn = result?.[0]?.columnsInfo.find((c) => c.column_name === "id");

			expect(idColumn?.data_type).toBe("uuid");
			expect(idColumn?.primary_key).toBe(true);
		});

		it("should parse camelCase column names including uuid foreign keys", () => {
			const text = `<@@SCHEMA@@>
@user:id:u#pk,email:s!u,createdAt:D,updatedAt:D
@session:id:s#pk,userId:u>user,expiresAt:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const userIdColumn = result?.[1]?.columnsInfo.find((c) => c.column_name === "userId");

			expect(result?.[0]?.columnsInfo.find((c) => c.column_name === "createdAt")?.data_type).toBe(
				"Date",
			);
			expect(userIdColumn?.data_type).toBe("uuid");
			expect(userIdColumn?.foreign_key).toEqual({
				foreign_table_name: "user",
				foreign_column_name: "id",
			});
		});
	});

	describe("parseCompactSchema - Foreign Keys", () => {
		it("should parse foreign key reference", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D
@posts:id:n#pk,user_id:n>users,title:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const userIdColumn = result?.[1]?.columnsInfo.find((c) => c.column_name === "user_id");

			expect(userIdColumn?.foreign_key).toEqual({
				foreign_table_name: "users",
				foreign_column_name: "id",
			});
		});

		it("should parse multiple foreign keys in one table", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D
@posts:id:n#pk,title:s,created_at:D,updated_at:D
@comments:id:n#pk,user_id:n>users,post_id:n>posts,body:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			const comments = result?.[2];

			const userIdColumn = comments?.columnsInfo.find((c) => c.column_name === "user_id");
			const postIdColumn = comments?.columnsInfo.find((c) => c.column_name === "post_id");

			expect(userIdColumn?.foreign_key?.foreign_table_name).toBe("users");
			expect(postIdColumn?.foreign_key?.foreign_table_name).toBe("posts");
		});
	});

	describe("parseCompactSchema - Relationships", () => {
		it("should parse hasMany relationship", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D|>posts
@posts:id:n#pk,user_id:n>users,title:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result?.[0]?.hasMany).toEqual(["posts"]);
		});

		it("should parse belongsTo relationship", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D
@posts:id:n#pk,user_id:n>users,title:s,created_at:D,updated_at:D|<users
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result?.[1]?.belongsTo).toEqual(["users"]);
		});

		it("should parse hasOne relationship", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D|^profile
@profile:id:n#pk,user_id:n>users,bio:s?,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result?.[0]?.hasOne).toEqual(["profile"]);
		});

		it("should parse belongsToMany relationship", () => {
			const text = `<@@SCHEMA@@>
@posts:id:n#pk,title:s,created_at:D,updated_at:D|*tags
@tags:id:n#pk,name:s,created_at:D,updated_at:D|*posts
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result?.[0]?.belongsToMany).toEqual(["tags"]);
			expect(result?.[1]?.belongsToMany).toEqual(["posts"]);
		});

		it("should parse multiple relationships", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D|^profile|>posts,comments
@profile:id:n#pk,user_id:n>users,bio:s?,created_at:D,updated_at:D|<users
@posts:id:n#pk,user_id:n>users,title:s,created_at:D,updated_at:D|<users|>comments
@comments:id:n#pk,user_id:n>users,post_id:n>posts,body:s,created_at:D,updated_at:D|<users,posts
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			const users = result?.[0];
			expect(users?.hasOne).toEqual(["profile"]);
			expect(users?.hasMany).toEqual(["posts", "comments"]);

			const posts = result?.[2];
			expect(posts?.belongsTo).toEqual(["users"]);
			expect(posts?.hasMany).toEqual(["comments"]);

			const comments = result?.[3];
			expect(comments?.belongsTo).toEqual(["users", "posts"]);
		});
	});

	describe("parseCompactSchema - Complex Schemas", () => {
		it("should parse a veterinary app schema", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,email:s!u,hashed_password:s,name:s,phone:s?,email_verified_at:D?,created_at:D,updated_at:D|>pets
@pets:id:n#pk,user_id:n>users,name:s,species:s,breed:s?,date_of_birth:D?,created_at:D,updated_at:D|<users|>appointments
@veterinarians:id:n#pk,email:s!u,hashed_password:s,name:s,specialization:s?,phone:s?,created_at:D,updated_at:D|>appointments
@appointments:id:n#pk,pet_id:n>pets,veterinarian_id:n>veterinarians,scheduled_at:D,status:s,notes:s?,created_at:D,updated_at:D|<pets,veterinarians
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result).toHaveLength(4);

			// Check users table
			const users = result?.[0];
			expect(users?.tableName).toBe("users");
			expect(users?.columnsInfo.find((c) => c.column_name === "email")?.unique).toBe(true);
			expect(users?.columnsInfo.find((c) => c.column_name === "phone")?.is_nullable).toBe("YES");
			expect(users?.hasMany).toEqual(["pets"]);

			// Check pets table
			const pets = result?.[1];
			expect(pets?.tableName).toBe("pets");
			expect(pets?.columnsInfo.find((c) => c.column_name === "user_id")?.foreign_key?.foreign_table_name).toBe("users");
			expect(pets?.belongsTo).toEqual(["users"]);
			expect(pets?.hasMany).toEqual(["appointments"]);

			// Check appointments table
			const appointments = result?.[3];
			expect(appointments?.columnsInfo.find((c) => c.column_name === "pet_id")?.foreign_key?.foreign_table_name).toBe("pets");
			expect(appointments?.columnsInfo.find((c) => c.column_name === "veterinarian_id")?.foreign_key?.foreign_table_name).toBe("veterinarians");
			expect(appointments?.belongsTo).toEqual(["pets", "veterinarians"]);
		});

		it("should parse an e-commerce schema with pivot table", () => {
			const text = `<@@SCHEMA@@>
@products:id:n#pk,name:s,price:n,created_at:D,updated_at:D|>order_products|*orders
@customers:id:n#pk,email:s!u,name:s,created_at:D,updated_at:D|>orders
@orders:id:n#pk,customer_id:n>customers,total:n,status:s,created_at:D,updated_at:D|<customers|>order_products|*products
@order_products:id:n#pk,order_id:n>orders,product_id:n>products,quantity:n,price:n,created_at:D,updated_at:D|<orders,products
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result).toHaveLength(4);

			const products = result?.[0];
			expect(products?.belongsToMany).toEqual(["orders"]);

			const orders = result?.[2];
			expect(orders?.belongsToMany).toEqual(["products"]);
			expect(orders?.belongsTo).toEqual(["customers"]);
		});
	});

	describe("parseCompactSchema - Edge Cases", () => {
		it("should handle extra whitespace", () => {
			const text = `<@@SCHEMA@@>
  @users:id:n#pk,  email:s!u,  name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);

			expect(result).not.toBeNull();
			expect(result?.[0]?.tableName).toBe("users");
		});

		it("should return null for empty schema block", () => {
			const text = `<@@SCHEMA@@>
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			expect(result).toBeNull();
		});

		it("should return null for invalid table format", () => {
			const text = `<@@SCHEMA@@>
users:id:n#pk,name:s
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			expect(result).toBeNull();
		});

		it("should return null for invalid column format", () => {
			const text = `<@@SCHEMA@@>
@users:id,name,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			expect(result).toBeNull();
		});

		it("should parse a hono-react compact auth schema", () => {
			const result = parseCompactSchema(honoReactCompactSchema);

			expect(result).not.toBeNull();
			expect(result).toHaveLength(2);
			expect(result?.[0]?.tableName).toBe("user");
			expect(result?.[0]?.columnsInfo.find((c) => c.column_name === "id")?.data_type).toBe("uuid");
			expect(result?.[1]?.columnsInfo.find((c) => c.column_name === "userId")?.foreign_key).toEqual({
				foreign_table_name: "user",
				foreign_column_name: "id",
			});
		});

		it("should return null for invalid data type", () => {
			const text = `<@@SCHEMA@@>
@users:id:n#pk,name:x,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			expect(result).toBeNull();
		});

		it("should return null for table without id column", () => {
			const text = `<@@SCHEMA@@>
@users:email:s!u,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>`;
			const result = parseCompactSchema(text);
			expect(result).toBeNull();
		});
	});

	describe("validateSchemaInfoFromResponse - Integration", () => {
		it("should validate compact schema in AI response", () => {
			const responseText = `Schema complete. Your application secured:
- User authentication with hashed passwords
- Pet management linked to owners
- Appointment scheduling system

<@@SCHEMA@@>
@users:id:n#pk,email:s!u,hashed_password:s,name:s,created_at:D,updated_at:D|>pets
@pets:id:n#pk,user_id:n>users,name:s,species:s,created_at:D,updated_at:D|<users
<@@/SCHEMA@@>

The foundation is solid. Build well.`;

			const result = validateSchemaInfoFromResponse(responseText);

			expect(result.success).toBe(true);
			expect(result.extracted).toBe(true);
			expect(result.data).toHaveLength(2);
		});

		it("should fall back to JSON format when compact is not present", () => {
			const responseText = `<!--schemaInfo:[{"tableName":"users","columnsInfo":[{"column_name":"id","data_type":"number","is_nullable":"NO","primary_key":true},{"column_name":"name","data_type":"string","is_nullable":"NO"},{"column_name":"created_at","data_type":"Date","is_nullable":"NO"},{"column_name":"updated_at","data_type":"Date","is_nullable":"NO"}]}]-->`;

			const result = validateSchemaInfoFromResponse(responseText);

			expect(result.success).toBe(true);
			expect(result.extracted).toBe(true);
			expect(result.data).toHaveLength(1);
		});

		it("should prefer compact format over JSON when both present", () => {
			const responseText = `<@@SCHEMA@@>
@compact_table:id:n#pk,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>
<!--schemaInfo:[{"tableName":"json_table","columnsInfo":[{"column_name":"id","data_type":"number","is_nullable":"NO","primary_key":true},{"column_name":"created_at","data_type":"Date","is_nullable":"NO"},{"column_name":"updated_at","data_type":"Date","is_nullable":"NO"}]}]-->`;

			const result = validateSchemaInfoFromResponse(responseText);

			expect(result.success).toBe(true);
			expect(result.data?.[0]?.tableName).toBe("compact_table");
		});
	});

	describe("removeHiddenSchemaFromText", () => {
		it("should remove compact schema from text", () => {
			const text = `Some text before.
<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>
Some text after.`;

			const result = removeHiddenSchemaFromText(text);

			expect(result).toBe("Some text before.\n\nSome text after.");
		});

		it("should remove JSON schema from text", () => {
			const text = `Some text.
<!--schemaInfo:[{"tableName":"users"}]-->
More text.`;

			const result = removeHiddenSchemaFromText(text);

			expect(result).toBe("Some text.\n\nMore text.");
		});

		it("should remove both formats from text", () => {
			const text = `Start.
<@@SCHEMA@@>
@users:id:n#pk,name:s,created_at:D,updated_at:D
<@@/SCHEMA@@>
Middle.
<!--schemaInfo:[{"tableName":"users"}]-->
End.`;

			const result = removeHiddenSchemaFromText(text);

			expect(result).toBe("Start.\n\nMiddle.\n\nEnd.");
		});
	});

	describe("Conversion Equivalence with masterSchema", () => {
		it("should produce equivalent structure for user-posts relationship", () => {
			// Represent the user-posts part of masterSchema in compact format
			const compactText = `<@@SCHEMA@@>
@user:id:n#pk,first_name:s,last_name:s,email:s!u,username:s!u,password:s,created_at:D,updated_at:D|^profile|>posts
@profile:id:n#pk,user_id:n>user,bio:s,created_at:D,updated_at:D|<user
@posts:id:n#pk,user_id:n>user,title:s,content:s?,created_at:D,updated_at:D|<user
<@@/SCHEMA@@>`;

			const result = parseCompactSchema(compactText);

			expect(result).not.toBeNull();
			expect(result).toHaveLength(3);

			// Verify user table structure
			const user = result?.find((t) => t.tableName === "user");
			expect(user?.hasOne).toEqual(["profile"]);
			expect(user?.hasMany).toEqual(["posts"]);
			expect(user?.columnsInfo.find((c) => c.column_name === "email")?.unique).toBe(true);
			expect(user?.columnsInfo.find((c) => c.column_name === "username")?.unique).toBe(true);

			// Verify profile table structure
			const profile = result?.find((t) => t.tableName === "profile");
			expect(profile?.belongsTo).toEqual(["user"]);
			expect(profile?.columnsInfo.find((c) => c.column_name === "user_id")?.foreign_key?.foreign_table_name).toBe("user");

			// Verify posts table structure
			const posts = result?.find((t) => t.tableName === "posts");
			expect(posts?.belongsTo).toEqual(["user"]);
			expect(posts?.columnsInfo.find((c) => c.column_name === "content")?.is_nullable).toBe("YES");
		});

		it("should produce equivalent structure for many-to-many relationship", () => {
			// Represent the order-product relationship from masterSchema
			const compactText = `<@@SCHEMA@@>
@product:id:n#pk,product_name:s,created_at:D,updated_at:D|>order_product|*order
@customer:id:n#pk,name:s,created_at:D,updated_at:D|>order
@order:id:n#pk,customer_id:n>customer,created_at:D,updated_at:D|<customer|>order_product|*product
@order_product:id:n#pk,order_id:n>order,product_id:n>product,created_at:D,updated_at:D|<order,product
<@@/SCHEMA@@>`;

			const result = parseCompactSchema(compactText);

			expect(result).not.toBeNull();
			expect(result).toHaveLength(4);

			// Verify product table
			const product = result?.find((t) => t.tableName === "product");
			expect(product?.hasMany).toEqual(["order_product"]);
			expect(product?.belongsToMany).toEqual(["order"]);

			// Verify order table
			const order = result?.find((t) => t.tableName === "order");
			expect(order?.belongsTo).toEqual(["customer"]);
			expect(order?.hasMany).toEqual(["order_product"]);
			expect(order?.belongsToMany).toEqual(["product"]);

			// Verify pivot table
			const orderProduct = result?.find((t) => t.tableName === "order_product");
			expect(orderProduct?.belongsTo).toEqual(["order", "product"]);
			expect(orderProduct?.columnsInfo.find((c) => c.column_name === "order_id")?.foreign_key?.foreign_table_name).toBe("order");
			expect(orderProduct?.columnsInfo.find((c) => c.column_name === "product_id")?.foreign_key?.foreign_table_name).toBe("product");
		});
	});

	describe("Token Efficiency Comparison", () => {
		it("compact format should be significantly shorter than JSON", () => {
			// JSON format (current)
			const jsonFormat = `<!--schemaInfo:[{"tableName":"users","columnsInfo":[{"column_name":"id","data_type":"number","is_nullable":"NO","primary_key":true},{"column_name":"email","data_type":"string","is_nullable":"NO","unique":true},{"column_name":"hashed_password","data_type":"string","is_nullable":"NO"},{"column_name":"name","data_type":"string","is_nullable":"NO"},{"column_name":"phone","data_type":"string","is_nullable":"YES"},{"column_name":"created_at","data_type":"Date","is_nullable":"NO"},{"column_name":"updated_at","data_type":"Date","is_nullable":"NO"}],"hasMany":["pets"]},{"tableName":"pets","columnsInfo":[{"column_name":"id","data_type":"number","is_nullable":"NO","primary_key":true},{"column_name":"user_id","data_type":"number","is_nullable":"NO","foreign_key":{"foreign_table_name":"users","foreign_column_name":"id"}},{"column_name":"name","data_type":"string","is_nullable":"NO"},{"column_name":"species","data_type":"string","is_nullable":"NO"},{"column_name":"created_at","data_type":"Date","is_nullable":"NO"},{"column_name":"updated_at","data_type":"Date","is_nullable":"NO"}],"belongsTo":["users"]}]-->`;

			// Compact format (new)
			const compactFormat = `<@@SCHEMA@@>
@users:id:n#pk,email:s!u,hashed_password:s,name:s,phone:s?,created_at:D,updated_at:D|>pets
@pets:id:n#pk,user_id:n>users,name:s,species:s,created_at:D,updated_at:D|<users
<@@/SCHEMA@@>`;

			// Compact should be at least 60% shorter
			const reduction = 1 - compactFormat.length / jsonFormat.length;
			expect(reduction).toBeGreaterThan(0.6);

			// Both should parse to equivalent structures
			const jsonResult = validateSchemaInfoFromResponse(jsonFormat);
			const compactResult = validateSchemaInfoFromResponse(compactFormat);

			expect(jsonResult.success).toBe(true);
			expect(compactResult.success).toBe(true);
			expect(jsonResult.data?.length).toBe(compactResult.data?.length);
		});
	});
});
