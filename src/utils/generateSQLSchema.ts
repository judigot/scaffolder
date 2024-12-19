import { format as formatSQL } from 'sql-formatter';
import { ISchemaInfo } from '@/interfaces/interfaces';
import {
  determineSQLDatabaseType,
  generateColumnDefinition,
  getForeignKeyConstraints,
} from '@/utils/common';
import { useFormStore } from '@/useFormStore';
import { APP_SETTINGS } from '@/constants';

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  const quote = useFormStore.getState().quote;

  // Function to generate foreign key constraints with ON DELETE CASCADE where applicable
  const generateForeignKeyConstraint = (
    table: string,
    schemaInfo: ISchemaInfo[],
  ): string[] => {
    return getForeignKeyConstraints(table, schemaInfo).map((constraint) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (APP_SETTINGS.onDeleteCascade) {
        const relatedTable = /REFERENCES\s+"(\w+)"/.exec(constraint)?.[1];
        const parentTable = schemaInfo.find(
          (t) => t.tableName === relatedTable,
        );
        const hasOneRelationship = parentTable?.hasOne.includes(table) ?? false;

        if (hasOneRelationship) {
          return constraint.replace(/;?$/, ' ON DELETE CASCADE');
        }
      }

      return constraint;
    });
  };

  return formatSQL(
    schemaInfo
      .map(({ tableName, columnsInfo }) => {
        const dbConnection = useFormStore.getState().formData.dbConnection;
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
