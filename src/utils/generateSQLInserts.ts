import { ParsedJSONSchema } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { formatDateForMySQL } from '@/utils/common';
import dayjs from 'dayjs';

const generateSQLInserts = (data: ParsedJSONSchema): string => {
  const quote = useFormStore.getState().quote;
  let inserts = '';
  const { dbType } = useFormStore.getState();

  Object.entries(data).forEach(([tableName, records]) => {
    if (records.length === 0) {
      return;
    }

    const firstRecord = records[0];
    const columnNames = Object.keys(firstRecord).join(', ');

    const values = records.map((record) => {
      const mappedValues = Object.values(record).map((value) => {
        if (typeof value === 'string') {
          // Check if the string is a valid date
          if (dayjs(value).isValid()) {
            value = new Date(value);
          } else {
            return `'${value.replace(/'/g, "''")}'`;
          }
        }
        if (value === null) {
          return 'NULL';
        }
        if (
          value instanceof Date ||
          (typeof value === 'string' && dayjs(value).isValid())
        ) {
          const dateValue = value instanceof Date ? value : new Date(value);
          if (dbType === 'postgresql') {
            return `'${dateValue.toISOString()}'`;
          }

          if (dbType === 'mysql') {
            return `'${formatDateForMySQL(dateValue)}'`;
          }
        }
        return value;
      });

      return `(${mappedValues.join(', ')})`;
    });

    inserts += `INSERT INTO ${quote}${tableName}${quote} (${columnNames}) VALUES ${values.join()};\n`;
  });

  return inserts;
};

export default generateSQLInserts;
