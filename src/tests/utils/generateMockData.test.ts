import type { ISchemaInfo } from "@/interfaces/interfaces.ts";
import generateMockData from "@/utils/generateMockData.ts";

describe("generateMockData", () => {
	it("orders tables so parent tables appear before children even if schema list is reversed", () => {
		const schema: ISchemaInfo[] = [
			{
				tableName: "session",
				columnsInfo: [
					{
						column_name: "id",
						data_type: "varchar(255)",
						is_nullable: "NO",
						primary_key: true,
						unique: true,
					},
					{
						column_name: "userId",
						data_type: "uuid",
						is_nullable: "NO",
						foreign_key: {
							foreign_table_name: "user",
							foreign_column_name: "id",
						},
					},
					{
						column_name: "expiresAt",
						data_type: "Date",
						is_nullable: "NO",
					},
				],
			},
			{
				tableName: "user",
				columnsInfo: [
					{
						column_name: "id",
						data_type: "uuid",
						is_nullable: "NO",
						primary_key: true,
					},
				],
			},
		];

		const mockData = generateMockData({
			mockDataRows: 2,
			schemaInfo: schema,
			dbType: "postgresql",
		});

		expect(mockData.user).toBeDefined();
		expect(mockData.session).toBeDefined();
		expect(mockData.user).toHaveLength(2);
		expect(mockData.session).toHaveLength(2);
		expect(mockData.session[0]?.userId).toBe(mockData.user[0]?.id);
	});
});
