import { useState } from 'react';
import { ITableInfo } from '@/interfaces/interfaces';
import { addRelationship } from '@/helpers/relationshipHelper';
import { handleCopy } from '@/helpers/stringHelper';
import CustomModal from '@/components/CustomModal';
import { useModalStore } from '@/useModalStore';

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
    // eslint-disable-next-line no-alert
    const newName = prompt('Enter new table name:', oldName);

    if (newName != null) {
      const updatedSchema = schemaInfo.map((table) => {
        /* Rename the table itself */
        if (table.table === oldName) {
          table.table = newName;
        }

        /* Define the relationship keys */
        const relationshipKeys: (keyof Pick<
          ITableInfo,
          | 'hasOne'
          | 'hasMany'
          | 'belongsTo'
          | 'belongsToMany'
          | 'foreignTables'
          | 'childTables'
        >)[] = [
          'hasOne',
          'hasMany',
          'belongsTo',
          'belongsToMany',
          'foreignTables',
          'childTables',
        ];

        /* Update relationships referencing the old table name */
        relationshipKeys.forEach((relation) => {
          if (Array.isArray(table[relation])) {
            table[relation] = table[relation].map((rel) =>
              rel === oldName ? newName : rel,
            );
          }
        });

        /* Update pivotRelationships referencing the old table name */
        table.pivotRelationships = table.pivotRelationships.map((rel) => ({
          relatedTable:
            rel.relatedTable === oldName ? newName : rel.relatedTable,
          pivotTable: rel.pivotTable === oldName ? newName : rel.pivotTable,
        }));

        return table;
      });

      setSchemaInfo(updatedSchema);
    }
  };

  const handleAddRelationship = (
    tableIndex: number,
    relationshipType: 'hasOne' | 'hasMany' | 'belongsToMany',
  ) => {
    // eslint-disable-next-line no-alert
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

  const handleRemoveRelationship = (tableIndex: number) => {
    const sourceTable = schemaInfo[tableIndex];
  
    // eslint-disable-next-line no-alert
    const confirmation = window.confirm(
      `Are you sure you want to remove the table "${sourceTable.table}" and its pivot child tables? This action cannot be undone.`,
    );
    if (!confirmation) {
      return;
    }
  
    /* Define the relationship keys */
    const relationshipKeys: (keyof Pick<
      ITableInfo,
      | 'hasOne'
      | 'hasMany'
      | 'belongsTo'
      | 'belongsToMany'
      | 'foreignTables'
      | 'childTables'
    >)[] = [
      'hasOne',
      'hasMany',
      'belongsTo',
      'belongsToMany',
      'foreignTables',
      'childTables',
    ];
  
    /* Gather pivot tables directly linked in the sourceTable's pivotRelationships */
    const pivotTablesFromRelationships = sourceTable.pivotRelationships.map(
      (rel) => rel.pivotTable,
    );
  
    /* Gather all tables to remove: source table + pivot child tables + pivot tables in pivotRelationships */
    const tablesToRemove = [
      sourceTable.table,
      ...schemaInfo
        .filter(
          (table) =>
            sourceTable.childTables.includes(table.table) && table.isPivot,
        )
        .map((table) => table.table),
      ...pivotTablesFromRelationships,
    ];
  
    /* Remove these tables and clean references */
    const updatedSchema = schemaInfo
      .filter((table) => !tablesToRemove.includes(table.table))
      .map((table) => {
        relationshipKeys.forEach((relation) => {
          const currentRelations = table[relation];
          if (Array.isArray(currentRelations)) {
            table[relation] = currentRelations.filter(
              (rel) => !tablesToRemove.includes(rel),
            );
          }
        });
  
        /* Remove pivot relationships referencing the removed tables */
        table.pivotRelationships = table.pivotRelationships.filter(
          (rel) =>
            !tablesToRemove.includes(rel.relatedTable) &&
            !tablesToRemove.includes(rel.pivotTable),
        );
  
        return table;
      });
  
    setSchemaInfo(updatedSchema);
  };
  

  const { isTableNameModalOpen, setIsTableNameModalOpen } = useModalStore();

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
        {schemaInfo.map(
          (
            {
              table,
              foreignTables,
              childTables,
              hasOne,
              hasMany,
              belongsTo,
              belongsToMany,
              isPivot,
              pivotRelationships,
            },
            index,
          ) => (
            <div key={table} className="p-4 border rounded">
              <div className="flex items-center mb-4">
                <h2 className="text-xl font-semibold mr-4">{table}</h2>
                {!isPivot && (
                  <>
                    <button
                      onClick={() => {
                        renameTable(index);
                      }}
                      className="text-blue-500 underline"
                    >
                      Rename Table
                    </button>
                    &nbsp;
                    <button
                      onClick={() => {
                        handleRemoveRelationship(index);
                      }}
                      className="text-blue-500 underline"
                    >
                      Remove Table
                    </button>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-semibold">Relationships</h3>
                <ul>
                  {foreignTables.length > 0 && (
                    <li>Foreign Tables: {foreignTables.join(', ')}</li>
                  )}
                  {childTables.length > 0 && (
                    <li>Child Tables: {childTables.join(', ')}</li>
                  )}
                  {hasOne.length > 0 && <li>Has one: {hasOne.join(', ')}</li>}
                  {hasMany.length > 0 && (
                    <li>Has Many: {hasMany.join(', ')}</li>
                  )}
                  {belongsTo.length > 0 && (
                    <li>Belongs To: {belongsTo.join(', ')}</li>
                  )}
                  {belongsToMany.length > 0 && (
                    <li>Belongs To Many: {belongsToMany.join(', ')}</li>
                  )}
                  {pivotRelationships.length > 0 && (
                    <li>
                      Pivot Relationships:
                      <ul style={{ paddingLeft: '1.5rem' }}>
                        {pivotRelationships.map((rel, index) => (
                          <li key={index}>
                            Related Table: <strong>{rel.relatedTable}</strong>,
                            Pivot Table: <strong>{rel.pivotTable}</strong>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
                {!isPivot && (
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
                )}
              </div>
            </div>
          ),
        )}
      </div>
      <CustomModal
        isOpen={isTableNameModalOpen}
        onClose={() => {
          setIsTableNameModalOpen(false);
        }}
        title={'Modal Title'}
      >
        <p>This modal uses a renamed state updater function.</p>
      </CustomModal>
    </div>
  );
}

export default SchemaBuilder;
