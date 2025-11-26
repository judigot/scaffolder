import { useFormStore } from '../useFormStore';
import { faker } from '@faker-js/faker';
// const MAX_ROWS = 10;
const NULL_ROWS = 1; // Must not be greater than MAX_ROWS
// Topological sort to determine the correct order of tables
const topologicalSort = (schemaInfo) => {
  const sorted = [];
  const visited = new Set();
  const temp = new Set();
  const visit = (table) => {
    if (temp.has(table.tableName)) {
      throw new Error('Cyclic dependency detected');
    }
    if (!visited.has(table.tableName)) {
      temp.add(table.tableName);
      (table.childTables ?? []).forEach((childTable) => {
        const childRelationship = schemaInfo.find(
          (r) => r.tableName === childTable,
        );
        if (childRelationship) {
          visit(childRelationship);
        }
      });
      temp.delete(table.tableName);
      visited.add(table.tableName);
      sorted.push(table);
    }
  };
  schemaInfo.forEach((table) => {
    if (!visited.has(table.tableName)) {
      visit(table);
    }
  });
  return sorted.reverse(); // Reverse to get the correct order
};
const generateMockData = ({ mockDataRows, schemaInfo }) => {
  const generatedData = {};
  const sortedRelationships = topologicalSort(schemaInfo);
  sortedRelationships.forEach(({ tableName, columnsInfo }) => {
    const fieldInfo = {};
    columnsInfo.forEach((column) => {
      const { column_name, data_type, primary_key, foreign_key, is_nullable } =
        column;
      if (!(column_name in fieldInfo)) {
        fieldInfo[column_name] = {
          types: new Set(),
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
    const mockRecords = [];
    for (let i = 0; i < mockDataRows; i++) {
      const mockRecord = {};
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
                .username({ firstName, lastName })
                .toLowerCase();
            } else {
              mockRecord[rawColumnName] = faker.internet
                .username()
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
          const pastDate = faker.date.past();
          // Extract milliseconds and pad to 6 digits
          const milliseconds = pastDate.getMilliseconds();
          const microseconds = `${String(milliseconds)}000`.slice(0, 3); // Pad to 6 digits
          if (dbType === 'postgresql') {
            // Format as ISO 8601 with padded microseconds for PostgreSQL
            const formattedDate = `${pastDate.toISOString().split('.')[0]}.${microseconds}Z`;
            mockRecord[rawColumnName] = formattedDate;
          }
          if (dbType === 'mysql') {
            // Format as 'YYYY-MM-DD HH:mm:ss.ffffff' for MySQL
            const formattedDate = `${pastDate.toISOString().replace('T', ' ').split('.')[0]}.${microseconds}`;
            mockRecord[rawColumnName] = formattedDate;
          }
          return;
        }
        mockRecord[rawColumnName] = null;
      });
      mockRecords.push(mockRecord);
    }
    generatedData[tableName] = mockRecords;
  });
  // Return the object sorted based on hierarchy
  const sortedData = {};
  sortedRelationships.forEach(({ tableName }) => {
    sortedData[tableName] = generatedData[tableName];
  });
  return sortedData;
};
export default generateMockData;
