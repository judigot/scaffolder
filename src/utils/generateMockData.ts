import { ISchemaInfo, ParsedJSONSchema } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { formatDateForMySQL } from '@/utils/common';
import { faker } from '@faker-js/faker';

interface IFieldInfo {
  types: Set<string>;
  isPrimaryKey?: boolean;
  foreignKey?: {
    table: string;
    field: string;
  };
  isNullable?: boolean;
}

// const MAX_ROWS = 10;
const NULL_ROWS = 1; // Must not be greater than MAX_ROWS

// Topological sort to determine the correct order of tables
const topologicalSort = (schemaInfo: ISchemaInfo[]): ISchemaInfo[] => {
  const sorted: ISchemaInfo[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const visit = (table: ISchemaInfo) => {
    if (temp.has(table.table)) {
      throw new Error('Cyclic dependency detected');
    }
    if (!visited.has(table.table)) {
      temp.add(table.table);
      table.childTables.forEach((childTable) => {
        const childRelationship = schemaInfo.find(
          (r) => r.table === childTable,
        );
        if (childRelationship) {
          visit(childRelationship);
        }
      });
      temp.delete(table.table);
      visited.add(table.table);
      sorted.push(table);
    }
  };

  schemaInfo.forEach((table) => {
    if (!visited.has(table.table)) {
      visit(table);
    }
  });

  return sorted.reverse(); // Reverse to get the correct order
};

const generateMockData = ({
  mockDataRows,
  schemaInfo,
}: {
  mockDataRows: number;
  schemaInfo: ISchemaInfo[];
}): ParsedJSONSchema => {
  const generatedData: ParsedJSONSchema = {};
  const sortedRelationships = topologicalSort(schemaInfo);

  sortedRelationships.forEach(({ table, columnsInfo }) => {
    const fieldInfo: Record<string, IFieldInfo> = {};

    columnsInfo.forEach((column) => {
      const { column_name, data_type, primary_key, foreign_key, is_nullable } =
        column;

      if (!(column_name in fieldInfo)) {
        fieldInfo[column_name] = {
          types: new Set<string>(),
          isNullable: is_nullable === 'YES',
        };
      }
      fieldInfo[column_name].types.add(data_type);
      fieldInfo[column_name].isPrimaryKey = primary_key;
      if (foreign_key) {
        fieldInfo[column_name].foreignKey = {
          table: foreign_key.foreign_table_name,
          field: foreign_key.foreign_column_name,
        };
      }
    });

    const mockRecords: Record<string, unknown>[] = [];

    for (let i = 0; i < mockDataRows; i++) {
      const mockRecord: Record<string, unknown> = {};

      let firstName = '';
      let lastName = '';

      Object.entries(fieldInfo).forEach(([rawColumnName, info]) => {
        const columnName = rawColumnName.toLowerCase();
        const fieldType = Array.from(info.types)[0];

        if (info.isPrimaryKey ?? false) {
          mockRecord[rawColumnName] = i + 1; // Generate ascending primary keys
          return;
        }

        if (info.foreignKey) {
          const { table, field } = info.foreignKey;
          const foreignRecords = generatedData[table];
          mockRecord[rawColumnName] = foreignRecords[i][field]; // Use a unique value from foreign key records
          return;
        }

        if ((info.isNullable ?? false) && i < NULL_ROWS) {
          // Make the first rows contain nulls for nullable columns
          mockRecord[rawColumnName] = null;
          return;
        }

        if (fieldType === 'string') {
          if (columnName.includes('password')) {
            mockRecord[rawColumnName] =
              '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m';
            return;
          }
          if (columnName.includes('email')) {
            if (firstName && lastName) {
              mockRecord[rawColumnName] = faker.internet
                .email({ firstName, lastName, provider: 'example.com' })
                .toLowerCase();
            } else {
              mockRecord[rawColumnName] = faker.internet
                .exampleEmail()
                .toLowerCase();
            }
            return;
          }
          if (columnName.includes('username')) {
            if (firstName && lastName) {
              mockRecord[rawColumnName] = faker.internet
                .userName({ firstName, lastName })
                .toLowerCase();
            } else {
              mockRecord[rawColumnName] = faker.internet
                .userName()
                .toLowerCase();
            }
            return;
          }
          if (
            columnName.includes('name') ||
            columnName.includes('first_name') ||
            columnName.includes('firstname')
          ) {
            const generatedFirstName = faker.person.firstName();
            mockRecord[rawColumnName] = generatedFirstName;
            firstName = generatedFirstName;
            return;
          }
          if (
            columnName.includes('middle_name') ||
            columnName.includes('middlename')
          ) {
            mockRecord[rawColumnName] = faker.person.middleName();
            return;
          }
          if (
            columnName.includes('last_name') ||
            columnName.includes('lastname')
          ) {
            const generatedLastName = faker.person.lastName();
            mockRecord[rawColumnName] = generatedLastName;
            lastName = generatedLastName;
            return;
          }
          if (columnName.includes('_name')) {
            const fullName = faker.person.fullName();
            mockRecord[rawColumnName] = fullName;
            const nameParts = fullName.split(' ');
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
            return;
          }
          if (columnName.endsWith('_description')) {
            mockRecord[rawColumnName] = faker.lorem.sentence();
            return;
          }
          mockRecord[rawColumnName] = faker.lorem.word();
          return;
        }

        if (fieldType === 'number') {
          mockRecord[rawColumnName] = faker.number.int();
          return;
        }

        if (fieldType === 'boolean') {
          mockRecord[rawColumnName] = faker.datatype.boolean();
          return;
        }

        if (fieldType === 'Date') {
          const { dbType } = useFormStore.getState();

          if (dbType === 'postgresql') {
            mockRecord[rawColumnName] = faker.date.past().toISOString(); // Ensure proper date format
          }

          if (dbType === 'mysql') {
            const pastDate: Date = faker.date.past();
            mockRecord[rawColumnName] = formatDateForMySQL(pastDate);
          }

          return;
        }

        mockRecord[rawColumnName] = null;
      });

      mockRecords.push(mockRecord);
    }

    generatedData[table] = mockRecords;
  });

  // Return the object sorted based on hierarchy
  const sortedData: ParsedJSONSchema = {};
  sortedRelationships.forEach(({ table }) => {
    sortedData[table] = generatedData[table];
  });

  return sortedData;
};

export default generateMockData;
