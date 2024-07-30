import { format as formatSQL } from 'sql-formatter';
import { ISchemaInfo } from '@/interfaces/interfaces';
import {
  generateColumnDefinition,
  getForeignKeyConstraints,
} from '@/utils/common';
import { useFormStore } from '@/useFormStore';

const generateSQLSchema = (schemaInfo: ISchemaInfo[]): string => {
  const quote = useFormStore.getState().quote;
  return formatSQL(
    schemaInfo
      .map(({ table, columnsInfo }) => {
        const columns = columnsInfo
          .map((columnName) =>
            generateColumnDefinition({ columnName, columnType: 'sql-tables' }),
          )
          .join(',\n  ');
        const foreignKeyConstraints = getForeignKeyConstraints(
          table,
          schemaInfo,
        ).join(',\n  ');
        const allColumnsAndKeys = [columns, foreignKeyConstraints]
          .filter(Boolean)
          .join(',\n  ');

        return `CREATE TABLE ${quote}${table}${quote} (\n  ${allColumnsAndKeys}\n);`;
      })
      .join('\n'),
  );
};

export default generateSQLSchema;
