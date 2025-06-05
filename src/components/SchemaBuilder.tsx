/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useState } from 'react';
import { ITableInfo, IColumnInfo } from '@/interfaces/interfaces.ts';
import {
    addRelationship,
    purgeForeignKeyTraces,
} from '@/helpers/relationshipHelper.ts';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import {
    Edit as EditIcon,
    Add as AddIcon,
    Close as CloseIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { getColumnDefaultDisplay } from '@/utils/common.ts';
import { getPrimaryKey } from '@/utils/common.ts';
import { changeCase } from '@/utils/common.ts';
import TableAdder from '@/components/TableAdder.tsx';
import renameTable from '@/utils/renameTable.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';

interface INewColumnFormData {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string;
  isPrimary: boolean;
  isUnique: boolean;
  foreignKey: {
    tableName: string;
    columnName: string;
    relationType: 'oneToOne' | 'oneToMany';
  } | null;
}

function SchemaBuilder() {
  const isPivotTableColumnsEditable = true;

  const { schemaInfo, setSchemaInfo } = useTransformationsStore();

  const { promptModal, newValue, editValue } = useModalStore();

  const [newColumnFormData, setNewColumnFormData] =
    useState<INewColumnFormData>({
      columnName: '',
      dataType: '',
      isNullable: false,
      defaultValue: '',
      isPrimary: false,
      isUnique: false,
      foreignKey: null,
    });

  const [selectedParentTable, setSelectedParentTable] = useState<string>('');

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;

    setNewColumnFormData((prev: INewColumnFormData) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRenameTable = async (index: number) => {
    const oldValue = schemaInfo[index].tableName;
    const newName = await editValue({ title: 'Edit table name', oldValue });

    if (!newName) {
      return;
    }

    // Update the schema info with the renamed table
    const updatedSchemaInfo = renameTable({
      oldTableName: oldValue,
      newTableName: newName,
      schemaInfo,
    });

    // Update the schema info in the store
    setSchemaInfo(updatedSchemaInfo);

    // If the renamed table was selected, update the selected index to match its new position
    if (selectedTableIndex === index) {
      const newIndex = updatedSchemaInfo.findIndex(
        (table) => table.tableName === newName,
      );
      setSelectedTableIndex(newIndex);
    }
  };

  const handleAddRelationship = async (
    tableIndex: number,
    relationshipType: 'hasOne' | 'hasMany' | 'belongsToMany',
  ) => {
    const sourceTable = schemaInfo[tableIndex];

    const newRelationshipName = await newValue({
      title: 'Enter new table name',
    });

    if (newRelationshipName) {
      const updatedSchema = addRelationship(
        schemaInfo,
        sourceTable.tableName,
        relationshipType,
        newRelationshipName,
      );
      setSchemaInfo(updatedSchema);
    }
  };

  const handleRemoveRelationship = async (tableIndex: number) => {
    const sourceTable = schemaInfo[tableIndex];

    const result = await promptModal({
      title: `Remove "${sourceTable.tableName}" table?`,
      description: `Are you sure you want to remove "${sourceTable.tableName}" table and its dependent tables?`,
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
    const pivotTablesFromRelationships = sourceTable.pivotRelationships?.map(
      (rel) => rel.pivotTable,
    );

    const tablesToRemove = [
      sourceTable.tableName,
      ...schemaInfo
        .filter((table) => {
          return Boolean(
            sourceTable.childTables?.includes(table.tableName) === true &&
              table.isPivot,
          );
        })
        .map((table) => table.tableName),
      ...(pivotTablesFromRelationships ?? []), // Handle possibly undefined
    ];

    /* Remove these tables and clean references */
    const updatedSchema = schemaInfo
      .filter((table) => !tablesToRemove.includes(table.tableName))
      .map((table) => {
        relationshipKeys.forEach((relation) => {
          const currentRelations = table[relation];
          if (currentRelations && Array.isArray(currentRelations)) {
            const relationsValue = currentRelations.filter(
              (rel) => !tablesToRemove.includes(rel),
            );
            if (relationsValue.length > 0) {
              table[relation] = [...relationsValue];
            }
          }
        });

        if (table.pivotRelationships) {
          const pivotRelationships = table.pivotRelationships.filter(
            (rel) =>
              !tablesToRemove.includes(rel.relatedTable) &&
              !tablesToRemove.includes(rel.pivotTable),
          );
          if (pivotRelationships.length > 0) {
            table.pivotRelationships = [...pivotRelationships];
          }
        }

        return table;
      });

    setSchemaInfo(purgeForeignKeyTraces(updatedSchema));
  };

  const [selectedTableIndex, setSelectedTableIndex] = useState<number | null>(
    0,
  );

  const pivotTables = schemaInfo.filter((table) => table.isPivot === true);

  const [isAddColumnFormVisible, setIsAddColumnFormVisible] = useState(false);

  const addNewColumnToTable = (columnData: INewColumnFormData): void => {
    if (selectedTableIndex === null) {
      return;
    }
    const updatedSchema = [...schemaInfo];
    const table = updatedSchema[selectedTableIndex];

    // Create the new column
    const newColumn: IColumnInfo = {
      column_name: columnData.columnName,
      data_type: columnData.dataType,
      is_nullable: columnData.isNullable ? 'YES' : 'NO',
      column_default:
        columnData.defaultValue === '' ? undefined : columnData.defaultValue,
      primary_key: columnData.isPrimary ? true : undefined,
      unique: columnData.isUnique ? true : undefined,
      foreign_key: columnData.foreignKey
        ? {
            foreign_table_name: columnData.foreignKey.tableName,
            foreign_column_name: columnData.foreignKey.columnName,
          }
        : undefined,
    };

    // Add the column to the table
    table.columnsInfo.push(newColumn);

    // If this is a foreign key, update relationships
    if (columnData.foreignKey) {
      const parentTableIndex = updatedSchema.findIndex(
        (t) => t.tableName === columnData.foreignKey?.tableName,
      );

      if (parentTableIndex !== -1) {
        if (
          updatedSchema[parentTableIndex].hasOne &&
          columnData.foreignKey.relationType === 'oneToOne'
        ) {
          if (
            !updatedSchema[parentTableIndex].hasOne.includes(table.tableName)
          ) {
            updatedSchema[parentTableIndex].hasOne.push(table.tableName);
          }
          if (
            table.belongsTo &&
            !table.belongsTo.includes(columnData.foreignKey.tableName)
          ) {
            table.belongsTo.push(columnData.foreignKey.tableName);
          }
        } else {
          if (
            updatedSchema[parentTableIndex].hasMany &&
            !updatedSchema[parentTableIndex].hasMany.includes(table.tableName)
          ) {
            updatedSchema[parentTableIndex].hasMany.push(table.tableName);
          }
          if (
            table.belongsTo &&
            !table.belongsTo.includes(columnData.foreignKey.tableName)
          ) {
            table.belongsTo.push(columnData.foreignKey.tableName);
          }
        }

        if (
          table.foreignTables &&
          !table.foreignTables.includes(columnData.foreignKey.tableName)
        ) {
          table.foreignTables.push(columnData.foreignKey.tableName);
        }

        if (
          updatedSchema[parentTableIndex].childTables &&
          !updatedSchema[parentTableIndex].childTables.includes(table.tableName)
        ) {
          updatedSchema[parentTableIndex].childTables.push(table.tableName);
        }
      }
    }

    setSchemaInfo(updatedSchema);
    setIsAddColumnFormVisible(false);
    // Reset form
    setNewColumnFormData({
      columnName: '',
      dataType: '',
      isNullable: false,
      defaultValue: '',
      isPrimary: false,
      isUnique: false,
      foreignKey: null,
    });
  };

  const handleForeignKeyChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const { value } = e.target;
    try {
      setNewColumnFormData((prev: INewColumnFormData) => ({
        ...prev,
        foreignKey: value
          ? {
              tableName: value,
              columnName: getPrimaryKey({
                tableName: value,
                schemaInfo,
              }),
              relationType: prev.foreignKey?.relationType ?? 'oneToOne',
            }
          : null,
      }));
      setSelectedParentTable(value);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error setting foreign key:', error.message);
      }
    }
  };

  const handleRelationTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const { value } = e.target;
    if (value === 'oneToOne' || value === 'oneToMany') {
      setNewColumnFormData((prev: INewColumnFormData) => ({
        ...prev,
        foreignKey: prev.foreignKey
          ? {
              ...prev.foreignKey,
              relationType: value,
            }
          : null,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    addNewColumnToTable(newColumnFormData);
  };

  const getAvailableForeignTables = (currentTable: ITableInfo): string[] => {
    const existingForeignTables = new Set<string>();

    // Only iterate if belongsTo is defined
    if (currentTable.belongsTo) {
      for (const tableName of currentTable.belongsTo) {
        existingForeignTables.add(tableName);
      }
    }

    // Only iterate if belongsToMany is defined
    if (currentTable.belongsToMany) {
      for (const tableName of currentTable.belongsToMany) {
        existingForeignTables.add(tableName);
      }
    }

    // Only iterate if foreignTables is defined
    if (currentTable.foreignTables) {
      for (const tableName of currentTable.foreignTables) {
        existingForeignTables.add(tableName);
      }
    }

    // Filter out tables that:
    // 1. Are the same as currentTable
    // 2. Already exist in the set
    // 3. Are pivot tables
    return schemaInfo
      .filter(
        (table) =>
          table.tableName !== currentTable.tableName &&
          !existingForeignTables.has(table.tableName) &&
          table.isPivot !== true,
      )
      .map((table) => table.tableName);
  };

  const isFormValid = (): boolean => {
    return Boolean(
      newColumnFormData.columnName.trim() &&
        newColumnFormData.dataType &&
        (!newColumnFormData.foreignKey ||
          newColumnFormData.foreignKey.relationType),
    );
  };

  if (selectedTableIndex === null) {
    throw new Error('selectedTableIndex is null');
  }

  // if (!schemaInfo[selectedTableIndex].hasOne) {
  //   throw new Error('hasOne is undefined for the selected table');
  // }
  // if (!schemaInfo[selectedTableIndex].hasMany) {
  //   throw new Error('hasMany is undefined for the selected table');
  // }
  // if (!schemaInfo[selectedTableIndex].belongsTo) {
  //   throw new Error('belongsTo is undefined for the selected table');
  // }
  // if (!schemaInfo[selectedTableIndex].belongsToMany) {
  //   throw new Error('belongsToMany is undefined for the selected table');
  // }
  // if (!schemaInfo[selectedTableIndex].foreignTables) {
  //   throw new Error('foreignTables is undefined for the selected table');
  // }
  // if (!schemaInfo[selectedTableIndex].pivotRelationships) {
  //   throw new Error('pivotRelationships is undefined for the selected table');
  // }
  // if (!schemaInfo[selectedTableIndex].childTables) {
  //   throw new Error('childTables is undefined for the selected table');
  // }

  return (
    <div className="text-white">
      {schemaInfo.length > 0 && (
        <button
          className="float-right sm:mb-2 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
          onClick={() => {
            void (async () => {
              const result = await promptModal({
                title: 'Delete All Tables',
                description:
                  'Are you sure you want to delete all tables? This action cannot be undone.',
                trueText: 'Yes',
                falseText: 'No',
              });
              if (result) {
                setSchemaInfo([]); // Clear all tables
              }
            })();
          }}
        >
          Delete Tables
        </button>
      )}
      <TableAdder />
      
      {schemaInfo.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="bg-gray-800/50 rounded-lg p-8 max-w-md mx-auto border border-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Tables Created</h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
                             Get started by creating your first database table. Define your schema structure and relationships to build your application&apos;s data model.
            </p>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center justify-start text-left">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-blue-400 text-xs font-bold">1</span>
                </div>
                <span>Enter a table name in the field above</span>
              </div>
              <div className="flex items-center justify-start text-left">
                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-green-400 text-xs font-bold">2</span>
                </div>
                                 <span>Click &quot;Add Table&quot; to create your first table</span>
              </div>
              <div className="flex items-center justify-start text-left">
                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-purple-400 text-xs font-bold">3</span>
                </div>
                <span>Add columns and define relationships</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
                /* Tables List */
         <div className="flex flex-col md:flex-row">
          <div className="pr-6 w-full md:w-80 flex-shrink-0 max-h-screen overflow-y-auto">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center mb-4">
                <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h2 className="text-lg font-semibold text-white">Main Tables</h2>
                <span className="ml-auto bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                  {schemaInfo.filter((table) => table.isPivot !== true).length}
                </span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2">
                {schemaInfo
                  .filter((table) => table.isPivot !== true)
                  .map((tableInfo) => {
                    const { tableName } = tableInfo;
                    const tableIndex = schemaInfo.findIndex(
                      ({ tableName: currentTable }) => currentTable === tableName
                    );
                    const isSelected = selectedTableIndex === tableIndex;

                    return (
                      <div
                        key={tableName}
                        role="button"
                        onKeyDown={() => {
                          return;
                        }}
                        tabIndex={-1}
                        className={`p-3 rounded-md cursor-pointer transition-all duration-200 group ${
                          isSelected
                            ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                            : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                        }`}
                        onClick={() => {
                          setSelectedTableIndex(tableIndex);
                        }}
                      >
                        <div className="flex items-center">
                          <svg className={`w-4 h-4 mr-2 ${isSelected ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v0H8v0z" />
                          </svg>
                          <span className="font-medium">{tableName}</span>
                          {isSelected && (
                            <svg className="w-3 h-3 ml-auto text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-indigo-400' : 'text-gray-500'}`}>
                          {tableInfo.columnsInfo.length} columns
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {pivotTables.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">Pivot Tables</h2>
                  <span className="ml-auto bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full">
                    {pivotTables.length}
                  </span>
                </div>
                                 <div className="space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2">
                  {schemaInfo
                    .filter((table) => table.isPivot === true)
                    .map((tableInfo) => {
                      const { tableName } = tableInfo;
                      const tableIndex = schemaInfo.findIndex(
                        ({ tableName: currentTable }) => currentTable === tableName
                      );
                      const isSelected = selectedTableIndex === tableIndex;

                      return (
                        <div
                          key={tableName}
                          role="button"
                          onKeyDown={() => {
                            return;
                          }}
                          tabIndex={-1}
                          className={`p-3 rounded-md cursor-pointer transition-all duration-200 group ${
                            isSelected
                              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                              : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedTableIndex(tableIndex);
                          }}
                        >
                          <div className="flex items-center">
                            <svg className={`w-4 h-4 mr-2 ${isSelected ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">{tableName}</span>
                            {isSelected && (
                              <svg className="w-3 h-3 ml-auto text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${isSelected ? 'text-purple-400' : 'text-gray-500'}`}>
                            {tableInfo.columnsInfo.length} columns
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

        <div className="flex-1 p-4 min-w-0">
          {selectedTableIndex !== null &&
            Boolean(schemaInfo[selectedTableIndex]) && (
              <div key={schemaInfo[selectedTableIndex].tableName}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    {schemaInfo[selectedTableIndex].tableName}
                    {schemaInfo[selectedTableIndex].isPivot !== true && (
                      <>
                        &nbsp;
                        <EditIcon
                          onClick={() => {
                            void (async () => {
                              await handleRenameTable(selectedTableIndex);
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

                {schemaInfo[selectedTableIndex].isPivot !== true && (
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
                      {/* <button className="px-3 py-1 bg-yellow-500 text-black font-bold rounded">
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
                      </button> */}
                    </div>
                    <br />
                  </>
                )}

                <h3 className="font-semibold mt-4 mb-2">Relationships</h3>
                <div className="space-y-4">
                  {/* One-to-One Relationships */}
                  {schemaInfo[selectedTableIndex].hasOne &&
                    schemaInfo[selectedTableIndex].hasOne.length > 0 && (
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-400 mb-2">
                          One-to-One Relationships
                        </h4>
                        <ul className="space-y-2">
                          {schemaInfo[selectedTableIndex].hasOne.map(
                            (table) => (
                              <li key={table} className="flex items-center">
                                <span className="text-blue-300">Has One:</span>
                                <span className="ml-2 font-medium">
                                  {table}
                                </span>
                              </li>
                            ),
                          )}
                          {schemaInfo[selectedTableIndex].belongsTo &&
                            schemaInfo[selectedTableIndex].belongsTo.length >
                              0 &&
                            schemaInfo[selectedTableIndex].belongsTo.map(
                              (table) => (
                                <li key={table} className="flex items-center">
                                  <span className="text-blue-300">
                                    Belongs To:
                                  </span>
                                  <span className="ml-2 font-medium">
                                    {table}
                                  </span>
                                </li>
                              ),
                            )}
                        </ul>
                      </div>
                    )}

                  {/* One-to-Many Relationships */}
                  {schemaInfo[selectedTableIndex].hasMany &&
                    schemaInfo[selectedTableIndex].hasMany.length > 0 && (
                      <div className="bg-green-500/10 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-400 mb-2">
                          One-to-Many Relationships
                        </h4>
                        <ul className="space-y-2">
                          {schemaInfo[selectedTableIndex].hasMany.map(
                            (table) => (
                              <li key={table} className="flex items-center">
                                <span className="text-green-300">
                                  Has Many:
                                </span>
                                <span className="ml-2 font-medium">
                                  {table}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Many-to-Many Relationships */}
                  {schemaInfo[selectedTableIndex].belongsToMany &&
                    schemaInfo[selectedTableIndex].belongsToMany.length > 0 &&
                    schemaInfo[selectedTableIndex].pivotRelationships &&
                    schemaInfo[selectedTableIndex].pivotRelationships.length >
                      0 && (
                      <div className="bg-purple-500/10 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-400 mb-2">
                          Many-to-Many Relationships
                        </h4>
                        <ul className="space-y-2">
                          {schemaInfo[selectedTableIndex].belongsToMany.map(
                            (table) => (
                              <li key={table} className="flex items-center">
                                <span className="text-purple-300">
                                  Belongs To Many:
                                </span>
                                <span className="ml-2 font-medium">
                                  {table}
                                </span>
                              </li>
                            ),
                          )}
                          {schemaInfo[
                            selectedTableIndex
                          ].pivotRelationships.map((rel, idx) => (
                            <li key={idx} className="flex items-center">
                              <span className="text-purple-300">
                                Through Pivot:
                              </span>
                              <span className="ml-2 font-medium">
                                {rel.relatedTable}
                                <span className="text-purple-300 mx-2">
                                  via
                                </span>
                                {rel.pivotTable}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Table References */}
                  {schemaInfo[selectedTableIndex].foreignTables &&
                    schemaInfo[selectedTableIndex].foreignTables.length > 0 &&
                    schemaInfo[selectedTableIndex].childTables &&
                    schemaInfo[selectedTableIndex].childTables.length > 0 && (
                      <div className="bg-gray-500/10 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-400 mb-2">
                          Table References
                        </h4>
                        <ul className="space-y-2">
                          {schemaInfo[selectedTableIndex].foreignTables.length >
                            0 && (
                            <li className="flex items-center">
                              <span className="text-gray-300">
                                Foreign Tables:
                              </span>
                              <span className="ml-2 font-medium">
                                {schemaInfo[
                                  selectedTableIndex
                                ].foreignTables.join(', ')}
                              </span>
                            </li>
                          )}
                          {schemaInfo[selectedTableIndex].childTables.length >
                            0 && (
                            <li className="flex items-center">
                              <span className="text-gray-300">
                                Child Tables:
                              </span>
                              <span className="ml-2 font-medium">
                                {schemaInfo[
                                  selectedTableIndex
                                ].childTables.join(', ')}
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                </div>

                <>
                  <br />
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold mb-2 inline-block">Columns</h3>
                    {(schemaInfo[selectedTableIndex].isPivot !== true ||
                      isPivotTableColumnsEditable) && (
                      <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsAddColumnFormVisible((prev: boolean) => !prev);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {isAddColumnFormVisible ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddColumnFormVisible(false);
                            }}
                          >
                            <span className="ml-1">Save</span>
                            <SaveIcon fontSize="medium" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddColumnFormVisible(true);
                            }}
                          >
                            <span className="ml-1">Add Columns</span>
                            <AddIcon fontSize="medium" />
                          </button>
                        )}
                      </div>
                    )}
                    {isAddColumnFormVisible && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddColumnFormVisible(false);
                        }}
                      >
                        <span className="ml-1">Cancel</span>
                        <CloseIcon fontSize="medium" />
                      </button>
                    )}
                  </div>

                  {isAddColumnFormVisible &&
                    (schemaInfo[selectedTableIndex].isPivot !== true ||
                      isPivotTableColumnsEditable) && (
                      <>
                        <br />
                        <form
                          id="schemaBuilderForm"
                          name="schemaBuilderForm"
                          className="mb-2 bg-gray-800 rounded shadow overflow-x-auto"
                          onSubmit={handleSubmit}
                        >
                          <div className="flex items-center border-b border-gray-600 p-2">
                            <input
                              name="columnName"
                              type="text"
                              value={newColumnFormData.columnName}
                              onChange={handleInputChange}
                              placeholder="Column Name"
                              className={`border border-gray-600 bg-gray-700 text-white px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[100px] mr-1`}
                              required
                            />
                            <select
                              name="dataType"
                              value={newColumnFormData.dataType}
                              onChange={handleInputChange}
                              className="border border-gray-600 bg-gray-700 text-white px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[100px] mr-1"
                              required
                            >
                              <option value="">Select Type</option>
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="Date">Date</option>
                              <option value="boolean">Boolean</option>
                            </select>
                            <select
                              name="foreignKey"
                              value={
                                newColumnFormData.foreignKey?.tableName ?? ''
                              }
                              onChange={handleForeignKeyChange}
                              className="border border-gray-600 bg-gray-700 text-white px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[100px] mx-1"
                            >
                              <option value="">Foreign Key</option>
                              {selectedTableIndex &&
                                getAvailableForeignTables(
                                  schemaInfo[selectedTableIndex],
                                ).map((tableName) => (
                                  <option key={tableName} value={tableName}>
                                    {tableName}
                                  </option>
                                ))}
                            </select>
                            {newColumnFormData.foreignKey && (
                              <select
                                name="relationType"
                                value={
                                  newColumnFormData.foreignKey.relationType
                                }
                                onChange={handleRelationTypeChange}
                                className="border border-gray-600 bg-gray-700 text-white px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[150px] mr-1"
                                required
                              >
                                <option value="">Select Relationship</option>
                                <option value="oneToOne">
                                  One-to-One (
                                  {changeCase(selectedParentTable).pascalCase}{' '}
                                  can only have one{' '}
                                  {
                                    changeCase(
                                      schemaInfo[selectedTableIndex]?.tableName,
                                    ).singular
                                  }
                                  )
                                </option>
                                <option value="oneToMany">
                                  One-to-Many (
                                  {changeCase(selectedParentTable).pascalCase}{' '}
                                  can have many{' '}
                                  {
                                    changeCase(
                                      schemaInfo[selectedTableIndex]?.tableName,
                                    ).plural
                                  }
                                  )
                                </option>
                              </select>
                            )}
                            <input
                              name="defaultValue"
                              type="text"
                              value={newColumnFormData.defaultValue}
                              onChange={handleInputChange}
                              placeholder="Default"
                              className="border border-gray-600 bg-gray-700 text-white px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[100px] mx-1"
                            />
                            <div className="flex items-center ml-auto">
                              <input
                                name="isNullable"
                                type="checkbox"
                                checked={newColumnFormData.isNullable}
                                onChange={handleInputChange}
                                className="mr-1 text-indigo-500"
                              />
                              <span className="text-gray-300 text-sm">
                                Nullable
                              </span>
                            </div>
                            <div className="flex items-center ml-auto">
                              <input
                                name="isPrimary"
                                type="checkbox"
                                checked={newColumnFormData.isPrimary}
                                onChange={handleInputChange}
                                className="mr-1 text-indigo-500"
                              />
                              <span className="text-gray-300 text-sm">
                                Primary
                              </span>
                            </div>
                            <div className="flex items-center ml-auto">
                              <input
                                name="isUnique"
                                type="checkbox"
                                checked={newColumnFormData.isUnique}
                                onChange={handleInputChange}
                                className="mr-1 text-indigo-500"
                              />
                              <span className="text-gray-300 text-sm">
                                Unique
                              </span>
                            </div>
                            <button
                              type="submit"
                              disabled={!isFormValid()}
                              className={`ml-2 px-3 py-1 font-bold rounded transition-colors duration-200 ${
                                isFormValid()
                                  ? 'bg-green-500 hover:bg-green-600 text-black'
                                  : 'bg-gray-500 cursor-not-allowed text-gray-300'
                              }`}
                              title={
                                !isFormValid()
                                  ? 'Please fill in required fields (Column Name and Data Type)'
                                  : 'Add column'
                              }
                            >
                              Add
                            </button>
                          </div>
                        </form>
                      </>
                    )}

                  <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-gray-600 px-2 py-1">
                            Column Name
                          </th>
                          <th className="border border-gray-600 px-2 py-1">
                            Data Type
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
                                  isPrimaryKey: column.primary_key ?? false,
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
                    </div>
                  </div>
                </>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SchemaBuilder;
