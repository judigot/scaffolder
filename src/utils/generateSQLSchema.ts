import { format as formatSQL } from 'sql-formatter';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import {
  determineSQLDatabaseType,
  generateColumnDefinition,
} from '@/utils/common.ts';
import { useFormStore } from '@/useFormStore.ts';
import { APP_SETTINGS } from '@/constants.ts';

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  const quote = useFormStore.getState().quote;

  // Function to generate foreign key constraints with ON DELETE CASCADE where applicable
  const generateForeignKeyConstraint = (
    tableName: string,
    schemaInfo: ISchemaInfo[],
  ): string[] => {
    const quote = useFormStore.getState().quote;
    const tableInfo = schemaInfo.find((rel) => rel.tableName === tableName);
    if (!tableInfo) {
      return [];
    }

    return tableInfo.columnsInfo
      .filter((col) => col.foreign_key != null)
      .map((col) => {
        const fk = col.foreign_key;
        if (!fk) {
          return '';
        }
        let constraint = `CONSTRAINT ${quote}FK_${tableName}_${col.column_name}${quote} FOREIGN KEY (${quote}${col.column_name}${quote}) REFERENCES ${quote}${fk.foreign_table_name}${quote}(${quote}${fk.foreign_column_name}${quote})`;

        // Add ON DELETE CASCADE where applicable
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (APP_SETTINGS.onDeleteCascade) {
          const parentTable = schemaInfo.find(
            (t) => t.tableName === fk.foreign_table_name,
          );
          const hasOneRelationship =
            parentTable?.hasOne?.includes(tableName) ?? false;

          if (hasOneRelationship) {
            constraint += ' ON DELETE CASCADE';
          }
        }

        return constraint;
      })
      .filter(Boolean);
  };

  return formatSQL(
    schemaInfo
      .map(({ tableName, columnsInfo }) => {
        const dbConnection = useFormStore.getState().dbConnection;
        const dbType = determineSQLDatabaseType(dbConnection);
        const columns = columnsInfo
          .map((column) =>
            generateColumnDefinition({
              columnName: column,
              columnType: dbType,
            }),
          )
          .join(',\n  ');

        const foreignKeyConstraints = generateForeignKeyConstraint(
          tableName,
          schemaInfo,
        ).join(',\n  ');

        const allColumnsAndKeys = [columns, foreignKeyConstraints]
          .filter(Boolean)
          .join(',\n  ');

        return `CREATE TABLE ${quote}${tableName}${quote} (\n  ${allColumnsAndKeys}\n);`;
      })
      .join('\n'),
  );
};

export default generateSQLSchema;
