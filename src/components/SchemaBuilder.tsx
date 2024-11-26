import { useState } from 'react';
import { ISchemaInfo, ITableInfo } from '@/interfaces/interfaces';
import { addRelationship } from '@/helpers/relationshipHelper';
import { useModalStore } from '@/components/Modal/base/modalStore';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { oneToOne } from '@/schema-infos';
import { getColumnDefaultDisplay } from '@/utils/common';

// const renameSchemaInstances = (
//   schemaData: ISchemaInfo[],
//   oldName: string,
//   newName: string,
// ): ISchemaInfo[] => {
//   const relationshipKeys: (keyof Pick<
//     ISchemaInfo,
//     | 'hasOne'
//     | 'hasMany'
//     | 'belongsTo'
//     | 'belongsToMany'
//     | 'foreignTables'
//     | 'childTables'
//   >)[] = [
//     'hasOne',
//     'hasMany',
//     'belongsTo',
//     'belongsToMany',
//     'foreignTables',
//     'childTables',
//   ];

//   return schemaData.map((schema) => {
//     const updatedSchema = { ...schema };

//     // Update relationships in specified keys
//     relationshipKeys.forEach((key) => {
//       updatedSchema[key] = updatedSchema[key].map((relation) =>
//         relation === oldName ? newName : relation,
//       );
//     });

//     // Update pivotRelationships
//     updatedSchema.pivotRelationships = updatedSchema.pivotRelationships.map(
//       (pivot) => ({
//         relatedTable:
//           pivot.relatedTable === oldName ? newName : pivot.relatedTable,
//         pivotTable: pivot.pivotTable === oldName ? newName : pivot.pivotTable,
//       }),
//     );

//     // Update table name
//     if (updatedSchema.table === oldName) {
//       updatedSchema.table = newName;
//     }

//     // Update foreign keys in columnsInfo
//     updatedSchema.columnsInfo = updatedSchema.columnsInfo.map((column) => {
//       if (
//         column.foreign_key &&
//         column.foreign_key.foreign_table_name === oldName
//       ) {
//         return {
//           ...column,
//           foreign_key: {
//             ...column.foreign_key,
//             foreign_table_name: newName,
//           },
//         };
//       }
//       return column;
//     });

//     return updatedSchema;
//   });
// };

function SchemaBuilder() {
  const [schemaInfo, setSchemaInfo] = useState<ISchemaInfo[]>(oneToOne);
  // const [schemaInfo, setSchemaInfo] = useState<ISchemaInfo[]>(oneToMany);
  // const [schemaInfo, setSchemaInfo] = useState<ISchemaInfo[]>(manyToMany);

  const { promptModal, editValue } = useModalStore();

  const renameTable = async (index: number) => {
    const oldValue = schemaInfo[index].table;

    const newName = await editValue({ title: 'Edit table name', oldValue });

    if (!newName) {
      return;
    }

    const updatedSchema = schemaInfo.map((table) => {
      /* Rename the table itself */
      if (table.table === oldValue) {
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
            rel === oldValue ? newName : rel,
          );
        }
      });

      /* Update pivotRelationships referencing the old table name */
      table.pivotRelationships = table.pivotRelationships.map((rel) => ({
        relatedTable:
          rel.relatedTable === oldValue ? newName : rel.relatedTable,
        pivotTable: rel.pivotTable === oldValue ? newName : rel.pivotTable,
      }));

      return table;
    });

    setSchemaInfo(updatedSchema);
  };

  const handleAddRelationship = async (
    tableIndex: number,
    relationshipType: 'hasOne' | 'hasMany' | 'belongsToMany',
  ) => {
    const newRelationshipName = await editValue({
      title: 'Enter new table name',
      oldValue: '',
    });

    if (newRelationshipName) {
      const updatedSchema = addRelationship(
        schemaInfo,
        tableIndex,
        relationshipType,
        newRelationshipName,
      );
      setSchemaInfo(updatedSchema);
    }
  };

  const handleRemoveRelationship = async (tableIndex: number) => {
    const sourceTable = schemaInfo[tableIndex];

    const result = await promptModal({
      title: `Remove "${sourceTable.table}" table?`,
      description: `Are you sure you want to remove "${sourceTable.table}" table and its dependent tables?`,
      trueText: 'Yes',
      falseText: 'No',
    });

    if (!result) {
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

  const [selectedTableIndex, setSelectedTableIndex] = useState<number | null>(
    0,
  );

  const pivotTables = schemaInfo.filter((table) => table.isPivot);

  return (
    <div className="p-4 bg-gray-800 text-white">
      <div className="flex">
        <div className="w-1/4 p-4 border-r border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Main Tables</h2>
          <ul className="space-y-2">
            {schemaInfo
              .filter((table) => !table.isPivot)
              .map((tableInfo) => {
                const { table } = tableInfo;

                return (
                  <li key={table}>
                    <div
                      role="button"
                      onKeyDown={() => {
                        return;
                      }}
                      tabIndex={-1} // -1 means it cannot be tabbed
                      className="cursor-pointer hover:text-indigo-400"
                      onClick={() => {
                        const pivotTableIndex = schemaInfo.findIndex(
                          ({ table: currentTable }) => {
                            return currentTable === table;
                          },
                        );
                        setSelectedTableIndex(pivotTableIndex);
                      }} // Set the selected table index on click
                    >
                      {table}
                    </div>
                  </li>
                );
              })}
          </ul>

          {pivotTables.length > 0 && (
            <>
              <br />
              <br />
              <h2 className="text-xl font-semibold mb-4">Pivot Tables</h2>
              <ul className="space-y-2">
                {schemaInfo
                  .filter((table) => table.isPivot)
                  .map((tableInfo) => {
                    const { table } = tableInfo;

                    return (
                      <li key={table}>
                        <div
                          role="button"
                          onKeyDown={() => {
                            return;
                          }}
                          tabIndex={-1} // -1 means it cannot be tabbed
                          className="cursor-pointer hover:text-indigo-400"
                          onClick={() => {
                            const pivotTableIndex = schemaInfo.findIndex(
                              ({ table: currentTable }) => {
                                return currentTable === table;
                              },
                            );
                            setSelectedTableIndex(pivotTableIndex);
                          }}
                        >
                          {table}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </div>

        <div className="w-3/4 p-4">
          {selectedTableIndex !== null &&
            Boolean(schemaInfo[selectedTableIndex]) && (
              <div key={schemaInfo[selectedTableIndex].table}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    {schemaInfo[selectedTableIndex].table}
                    {!schemaInfo[selectedTableIndex].isPivot && (
                      <>
                        &nbsp;
                        <EditIcon
                          onClick={() => {
                            void (async () => {
                              await renameTable(selectedTableIndex);
                            })();
                          }}
                          fontSize="small"
                          className={`text-white-500 cursor-pointer`}
                        />
                        &nbsp;
                        <CloseIcon
                          onClick={() => {
                            void (async () => {
                              await handleRemoveRelationship(
                                selectedTableIndex,
                              );
                            })();
                          }}
                          fontSize="medium"
                          className={`text-white-500 cursor-pointer`}
                        />
                      </>
                    )}
                  </h2>
                </div>

                {!schemaInfo[selectedTableIndex].isPivot && (
                  <>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => {
                          void (async () => {
                            await handleAddRelationship(
                              selectedTableIndex,
                              'hasOne',
                            );
                          })();
                        }}
                        className="px-3 py-1 bg-blue-500 text-black font-bold rounded"
                      >
                        Add One-to-One
                      </button>
                      <button
                        onClick={() => {
                          void (async () => {
                            await handleAddRelationship(
                              selectedTableIndex,
                              'hasMany',
                            );
                          })();
                        }}
                        className="px-3 py-1 bg-green-500 text-black font-bold rounded"
                      >
                        Add One-to-Many
                      </button>
                      <button
                        onClick={() => {
                          void (async () => {
                            await handleAddRelationship(
                              selectedTableIndex,
                              'belongsToMany',
                            );
                          })();
                        }}
                        className="px-3 py-1 bg-purple-500 text-black font-bold rounded"
                      >
                        Add Many-to-Many
                      </button>
                      <button className="px-3 py-1 bg-yellow-500 text-black font-bold rounded">
                        Add Self-Referencing Relationship
                      </button>
                      <button className="px-3 py-1 bg-red-500 text-black font-bold rounded">
                        Add Polymorphic Relationship
                      </button>
                      <button className="px-3 py-1 bg-indigo-500 text-black font-bold rounded">
                        Add Parent-Child Relationship
                      </button>
                      <button className="px-3 py-1 bg-teal-500 text-black font-bold rounded">
                        Add Inverse Relationship
                      </button>
                      <button className="px-3 py-1 bg-orange-500 text-black font-bold rounded">
                        Add Cascade Relationship
                      </button>
                      <button className="px-3 py-1 bg-pink-500 text-black font-bold rounded">
                        Add Composite Relationship
                      </button>
                      <button className="px-3 py-1 bg-gray-500 text-black font-bold rounded">
                        Add Conditional Relationship
                      </button>
                      <button className="px-3 py-1 bg-lime-500 text-black font-bold rounded">
                        Add Optional Relationship
                      </button>
                    </div>
                    <br />
                  </>
                )}

                <h3 className="font-semibold mt-4 mb-2">Relationships</h3>
                <ul className="space-y-1">
                  {schemaInfo[selectedTableIndex].foreignTables.length > 0 && (
                    <li>
                      Foreign Tables:{' '}
                      {schemaInfo[selectedTableIndex].foreignTables.join(', ')}
                    </li>
                  )}
                  {schemaInfo[selectedTableIndex].childTables.length > 0 && (
                    <li>
                      Child Tables:{' '}
                      {schemaInfo[selectedTableIndex].childTables.join(', ')}
                    </li>
                  )}
                  {schemaInfo[selectedTableIndex].hasOne.length > 0 && (
                    <li>
                      Has One:{' '}
                      {schemaInfo[selectedTableIndex].hasOne.join(', ')}
                    </li>
                  )}
                  {schemaInfo[selectedTableIndex].hasMany.length > 0 && (
                    <li>
                      Has Many:{' '}
                      {schemaInfo[selectedTableIndex].hasMany.join(', ')}
                    </li>
                  )}
                  {schemaInfo[selectedTableIndex].belongsTo.length > 0 && (
                    <li>
                      Belongs To:{' '}
                      {schemaInfo[selectedTableIndex].belongsTo.join(', ')}
                    </li>
                  )}
                  {schemaInfo[selectedTableIndex].belongsToMany.length > 0 && (
                    <li>
                      Belongs To Many:{' '}
                      {schemaInfo[selectedTableIndex].belongsToMany.join(', ')}
                    </li>
                  )}
                  {schemaInfo[selectedTableIndex].pivotRelationships.length >
                    0 && (
                    <li>
                      Pivot Relationships:
                      <ul className="pl-4 list-disc">
                        {schemaInfo[selectedTableIndex].pivotRelationships.map(
                          (rel, idx) => (
                            <li key={idx}>
                              Related Table: <strong>{rel.relatedTable}</strong>
                              , Pivot Table: <strong>{rel.pivotTable}</strong>
                            </li>
                          ),
                        )}
                      </ul>
                    </li>
                  )}
                </ul>
                {!schemaInfo[selectedTableIndex].isPivot && (
                  <>
                    <br />
                    <h3 className="font-semibold mb-2 inline-block">Columns</h3>
                    <div className="inline-block">
                      <AddIcon
                        onClick={() => {
                          void (async () => {
                            // await handleRemoveRelationship(
                            //   selectedTableIndex,
                            // );
                          })();
                        }}
                        fontSize="medium"
                        className={`text-white-500 cursor-pointer`}
                      />
                    </div>
                    <table className="w-full text-left border-collapse border border-gray-600">
                      <thead>
                        <tr>
                          <th className="border border-gray-600 px-2 py-1">
                            Name
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Type
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Nullable
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Default
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Primary
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Unique
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Foreign Key
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {schemaInfo[selectedTableIndex].columnsInfo.map(
                          (column) => (
                            <tr key={column.column_name}>
                              <td className="border border-gray-600 px-2 py-1">
                                {column.column_name}
                              </td>
                              <td className="border border-gray-600 px-2 py-1">
                                {column.data_type}
                              </td>
                              <td className="border border-gray-600 px-2 py-1">
                                {column.is_nullable}
                              </td>
                              <td className="border border-gray-600 px-2 py-1">
                                {getColumnDefaultDisplay({
                                  isPrimaryKey: column.primary_key,
                                  isNullable: column.is_nullable,
                                  columnDefault: column.column_default,
                                })}
                              </td>
                              <td className="border border-gray-600 px-2 py-1">
                                {column.primary_key ? 'Yes' : 'No'}
                              </td>
                              <td className="border border-gray-600 px-2 py-1">
                                {column.unique ? 'Yes' : 'No'}
                              </td>
                              <td className="border border-gray-600 px-2 py-1">
                                {column.foreign_key
                                  ? `${column.foreign_key.foreign_column_name} (${column.foreign_key.foreign_table_name})`
                                  : 'None'}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default SchemaBuilder;
