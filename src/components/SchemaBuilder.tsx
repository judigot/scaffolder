import { useState } from 'react';
import { ITableInfo } from '@/interfaces/interfaces';
import { addRelationship } from '@/helpers/relationshipHelper';
import { handleCopy } from '@/helpers/stringHelper';

function SchemaBuilder() {
  const [schemaInfo, setSchemaInfo] = useState<ITableInfo[]>([
    {
      table: 'user',
      foreignTables: [],
      childTables: [],
      isPivot: false,
      hasOne: [],
      hasMany: [],
      belongsTo: [],
      belongsToMany: [],
      pivotRelationships: [],
    },
  ]);

  const renameTable = (index: number) => {
    const oldName = schemaInfo[index].table;
    const newName = prompt('Enter new table name:', oldName);

    if (newName != null) {
      const updatedSchema = schemaInfo.map((table) => {
        // Rename the table and update relationships
        if (table.table === oldName) {
          table.table = newName;
        }

        // Update relationships that reference the old table name
        ['hasOne', 'hasMany', 'belongsTo', 'belongsToMany'].forEach(
          (relation) => {
            table[relation as keyof ITableInfo] = (
              table[relation as keyof ITableInfo] as string[]
            ).map((rel) => (rel === oldName ? newName : rel));
          },
        );

        return table;
      });

      setSchemaInfo(updatedSchema);
    }
  };

  const handleAddRelationship = (
    tableIndex: number,
    relationshipType: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany',
  ) => {
    const newRelationshipName = prompt(
      `Enter ${relationshipType} relationship name:`,
    );

    if (newRelationshipName != null) {
      const updatedSchema = addRelationship(
        schemaInfo,
        tableIndex,
        relationshipType,
        newRelationshipName,
      );
      setSchemaInfo(updatedSchema);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Schema Builder</h1>
      <button
        onClick={(e) => {
          e.preventDefault();
          handleCopy(JSON.stringify(schemaInfo, null, 4));
        }}
        className="px-3 py-1 bg-indigo-500 text-white rounded"
      >
        Copy Schema Info
      </button>
      <br />
      <br />
      <div className="space-y-8">
        {schemaInfo.map((table, index) => (
          <div key={table.table} className="p-4 border rounded">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold mr-4">{table.table}</h2>
              <button
                onClick={() => {
                  renameTable(index);
                }}
                className="text-blue-500 underline"
              >
                Rename Table
              </button>
            </div>
            <div>
              {/* <h3 className="font-semibold">Relationships</h3> */}
              <ul>
                {table.hasOne.length > 0 && (
                  <li>Has one: {table.hasOne.join(', ')}</li>
                )}
                {table.hasMany.length > 0 && (
                  <li>Has Many: {table.hasMany.join(', ')}</li>
                )}
                {table.belongsTo.length > 0 && (
                  <li>Belongs To: {table.belongsTo.join(', ')}</li>
                )}
                {table.belongsToMany.length > 0 && (
                  <li>Belongs To Many: {table.belongsToMany.join(', ')}</li>
                )}
              </ul>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => {
                    handleAddRelationship(index, 'hasOne');
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  Add One-to-One
                </button>
                <button
                  onClick={() => {
                    handleAddRelationship(index, 'hasMany');
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded"
                >
                  Add One-to-Many
                </button>
                <button
                  onClick={() => {
                    handleAddRelationship(index, 'belongsToMany');
                  }}
                  className="px-3 py-1 bg-purple-500 text-white rounded"
                >
                  Add Many-to-Many (Join/Pivot Table)
                </button>

                <button className="px-3 py-1 bg-yellow-500 text-white rounded">
                  Add Self-Referencing Relationship
                </button>

                <button className="px-3 py-1 bg-red-500 text-white rounded">
                  Add Polymorphic Relationship
                </button>

                <button className="px-3 py-1 bg-indigo-500 text-white rounded">
                  Add Parent-Child Relationship
                </button>

                <button className="px-3 py-1 bg-teal-500 text-white rounded">
                  Add Inverse Relationship
                </button>

                <button className="px-3 py-1 bg-orange-500 text-white rounded">
                  Add Cascade Relationship
                </button>

                <button className="px-3 py-1 bg-pink-500 text-white rounded">
                  Add Composite Relationship
                </button>

                <button className="px-3 py-1 bg-gray-500 text-white rounded">
                  Add Conditional Relationship
                </button>

                <button className="px-3 py-1 bg-lime-500 text-white rounded">
                  Add Optional Relationship
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SchemaBuilder;
