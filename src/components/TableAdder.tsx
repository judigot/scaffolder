import { useState } from 'react';
import { IJSONSchema, ISchemaInfo } from '@/interfaces/interfaces.ts';
import identifySchema from '@/utils/identifySchema.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';

interface ITableAdderProps {
  className?: string;
}

function TableAdder({ className = '' }: ITableAdderProps) {
  const { schemaInfo, setSchemaInfo } = useTransformationsStore();
  const [newTableName, setNewTableName] = useState<string>('');

  const handleAddTable = () => {
    if (newTableName) {
      const newTableId = `${newTableName}_id`;

      // Check if table already exists
      const doesTableExist = schemaInfo.some(
        (table) => table.tableName === newTableName,
      );

      if (!doesTableExist) {
        // Create a minimal JSON schema for the new table
        const jsonSchema: IJSONSchema = {
          [newTableName]: [{ [newTableId]: 1 }],
        };

        // Use identifySchema to create a standardized schema structure
        const newTableSchema = identifySchema(jsonSchema);
        
        // Add the new table to existing schema
        const updatedSchema: ISchemaInfo[] = [...schemaInfo, ...newTableSchema];
        setSchemaInfo(updatedSchema);
        setNewTableName('');
      }
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <input
        id="newTableName"
        name="newTableName"
        type="text"
        placeholder="Enter new table name"
        value={newTableName}
        onChange={(e) => { setNewTableName(e.target.value); }}
        className="mb-2 p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleAddTable();
            e.preventDefault();
          }
        }}
      />
      <button
        onClick={handleAddTable}
        disabled={!newTableName}
        className={`px-4 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
          ${newTableName ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}
          dark:bg-indigo-700 dark:hover:bg-indigo-600 dark:focus:ring-indigo-300 dark:focus:ring-opacity-50 dark:disabled:bg-gray-600`}
        type="button"
      >
        Add Table
      </button>
    </div>
  );
}

export default TableAdder; 