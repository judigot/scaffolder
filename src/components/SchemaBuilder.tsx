import { useState } from 'react';
import { ISchemaInfo, ITableInfo } from '@/interfaces/interfaces';
import { addRelationship } from '@/helpers/relationshipHelper';
import { handleCopy } from '@/helpers/stringHelper';
import CustomModal from '@/components/Modal/base/CustomModal';
import { useModalStore } from '@/useModalStore';
import { manyToMany } from '@/schema-infos/manyToMany';

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

//     // Update tableCases if they match oldName
//     const updatedTableCases = { ...updatedSchema.tableCases };
//     for (const [caseKey, caseValue] of Object.entries(updatedTableCases)) {
//       if (caseValue === oldName) {
//         updatedTableCases[caseKey as keyof ISchemaInfo['tableCases']] = newName;
//       }
//     }
//     updatedSchema.tableCases = updatedTableCases;

//     return updatedSchema;
//   });
// };

function SchemaBuilder() {
  // const [schemaInfo, setSchemaInfo] = useState<ISchemaInfo[]>(oneToOne);
  // const [schemaInfo, setSchemaInfo] = useState<ISchemaInfo[]>(oneToMany);
  const [schemaInfo, setSchemaInfo] = useState<ISchemaInfo[]>(manyToMany);

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
          /* prettier-ignore */ handleCopy(JSON.stringify(schemaInfo.map( ({ requiredColumns: _1, columnsInfo: _2, foreignKeys: _3, tableCases: _4, ...newObject }) => newObject, ), null, 4));
        }}
        className="px-3 py-1 bg-indigo-500 text-white rounded"
      >
        Copy Schema Info
      </button>
      <br />
      <br />
      <button
        onClick={(e) => {
          e.preventDefault();
          handleCopy(JSON.stringify(schemaInfo, null, 4));
        }}
        className="px-3 py-1 bg-indigo-500 text-white rounded"
      >
        Copy Schema Info with Columns
      </button>
      <div className="space-y-8 mt-6">
        {schemaInfo.map((tableInfo, index) => {
          const {
            table,
            foreignTables,
            childTables,
            hasOne,
            hasMany,
            belongsTo,
            belongsToMany,
            isPivot,
            pivotRelationships,
            columnsInfo,
          } = tableInfo;

          return (
            <div key={table} className="p-4 border rounded">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{table}</h2>
                {!isPivot && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        renameTable(index);
                      }}
                      className="text-blue-500 underline"
                    >
                      Rename Table
                    </button>
                    <button
                      onClick={() => {
                        handleRemoveRelationship(index);
                      }}
                      className="text-blue-500 underline"
                    >
                      Remove Table
                    </button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Columns</h3>
                <table className="w-full text-left border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-2 py-1">Name</th>
                      <th className="border border-gray-300 px-2 py-1">Type</th>
                      <th className="border border-gray-300 px-2 py-1">
                        Nullable
                      </th>
                      <th className="border border-gray-300 px-2 py-1">
                        Default
                      </th>
                      <th className="border border-gray-300 px-2 py-1">
                        Primary
                      </th>
                      <th className="border border-gray-300 px-2 py-1">
                        Unique
                      </th>
                      <th className="border border-gray-300 px-2 py-1">
                        Foreign Key
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {columnsInfo.map((column) => (
                      <tr key={column.column_name}>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.column_name}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.data_type}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.is_nullable}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.column_default ?? 'None'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.primary_key ? 'Yes' : 'No'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.unique ? 'Yes' : 'No'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {column.foreign_key
                            ? `${column.foreign_key.foreign_table_name} (${column.foreign_key.foreign_column_name})`
                            : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="font-semibold mt-4 mb-2">Relationships</h3>
                <ul className="space-y-1">
                  {foreignTables.length > 0 && (
                    <li>Foreign Tables: {foreignTables.join(', ')}</li>
                  )}
                  {childTables.length > 0 && (
                    <li>Child Tables: {childTables.join(', ')}</li>
                  )}
                  {hasOne.length > 0 && <li>Has One: {hasOne.join(', ')}</li>}
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
                      <ul className="pl-4 list-disc">
                        {pivotRelationships.map((rel, idx) => (
                          <li key={idx}>
                            Related Table: <strong>{rel.relatedTable}</strong>,
                            Pivot Table: <strong>{rel.pivotTable}</strong>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
                {!isPivot && (
                  <div className="flex flex-wrap gap-2 mt-4">
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
                      Add Many-to-Many
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
          );
        })}
      </div>
      <CustomModal
        isOpen={isTableNameModalOpen}
        onClose={() => {
          setIsTableNameModalOpen(false);
        }}
        title="Modal Title"
      >
        <p>This modal uses a renamed state updater function.</p>
      </CustomModal>
    </div>
  );
}

export default SchemaBuilder;
