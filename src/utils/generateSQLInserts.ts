import { ParsedJSONSchema } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import { formatDateForMySQL } from '@/utils/common.ts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

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
        if (value === null) {
          return 'NULL'; // Directly handle null values
        }

        if (typeof value === 'number') {
          return value; // Return value as is if it doesn't meet any of the above conditions
        }

        if (typeof value === 'string') {
          // Check if the string is a valid date
          const isValidDate = dayjs(value).isValid();
          if (isValidDate) {
            dayjs.extend(utc);
            const formattedDate = `${dayjs.utc(value).format('YYYY-MM-DDTHH:mm:ss')}.${value.split('.')[1]}`;
            const isPostgreSQL = dbType === 'postgresql';
            const isMySQL = dbType === 'mysql';

            if (isPostgreSQL) {
              return `'${formattedDate}'`;
            }

            if (isMySQL) {
              return `'${formatDateForMySQL(formattedDate)}'`;
            }

            return `'${formattedDate}'`; // Fallback for other databases
          }

          // Escape single quotes in non-date strings
          return `'${value.replace(/'/g, "''")}'`;
        }

        if (value instanceof Date) {
          // Handle Date objects directly
          dayjs.extend(utc);
          const formattedDate = `${dayjs.utc(value).format('YYYY-MM-DDTHH:mm:ss')}.${String(value.getMilliseconds()).padStart(3, '0')}000`;
          const isPostgreSQL = dbType === 'postgresql';
          const isMySQL = dbType === 'mysql';

          if (isPostgreSQL) {
            return `'${formattedDate}'`;
          }

          if (isMySQL) {
            return `'${formatDateForMySQL(formattedDate)}'`;
          }

          return `'${formattedDate}'`; // Fallback for other databases
        }
      });

      return `(${mappedValues.join(', ')})`;
    });

    inserts += `INSERT INTO ${quote}${tableName}${quote} (${columnNames}) VALUES ${values.join()};\n`;
  });

  return inserts;
};

export default generateSQLInserts;
