import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import useTransformationsStore from '../useTransformationsStore';
function TableAdder({ className = '' }) {
  const { schemaInfo, setSchemaInfo } = useTransformationsStore();
  const [newTableName, setNewTableName] = useState('');
  const handleAddTable = () => {
    if (newTableName) {
      const newTableId = `${newTableName}_id`;
      // Check if table already exists
      const doesTableExist = schemaInfo.some(
        (table) => table.tableName === newTableName,
      );
      if (!doesTableExist) {
        const newTableSchema = {
          tableName: newTableName,
          columnsInfo: [
            {
              column_name: newTableId,
              data_type: 'number',
              is_nullable: 'NO',
              column_default: 'AUTO_INCREMENT',
              primary_key: true,
            },
          ],
          requiredColumns: [newTableId],
        };
        const updatedSchema = [...schemaInfo, newTableSchema];
        setSchemaInfo(updatedSchema);
        setNewTableName('');
      }
    }
  };
  return _jsxs('div', {
    className: `mb-4 ${className}`,
    children: [
      _jsx('input', {
        id: 'newTableName',
        name: 'newTableName',
        type: 'text',
        placeholder: 'Enter new table name',
        value: newTableName,
        onChange: (e) => {
          setNewTableName(e.target.value);
        },
        className:
          'mb-2 p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
        onKeyDown: (e) => {
          if (e.key === 'Enter') {
            handleAddTable();
            e.preventDefault();
          }
        },
      }),
      _jsx('button', {
        onClick: handleAddTable,
        disabled: !newTableName,
        className: `px-4 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
          ${newTableName ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}
          dark:bg-indigo-700 dark:hover:bg-indigo-600 dark:focus:ring-indigo-300 dark:focus:ring-opacity-50 dark:disabled:bg-gray-600`,
        type: 'button',
        children: 'Add Table',
      }),
    ],
  });
}
export default TableAdder;
