/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useState, useRef, useEffect } from 'react';
import { ITableInfo, IColumnInfo } from '@/interfaces/interfaces.ts';
import {
  addRelationship,
  purgeForeignKeyTraces,
} from '@/helpers/relationshipHelper.ts';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import { Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
import { getColumnDefaultDisplay } from '@/utils/common.ts';
import { getPrimaryKey } from '@/utils/common.ts';
import TableAdder from '@/components/TableAdder.tsx';
import renameTable from '@/utils/renameTable.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import yaml from 'yaml';

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
      dataType: 'string',
      isNullable: false,
      defaultValue: '',
      isPrimary: false,
      isUnique: false,
      foreignKey: null,
    });

  const [_selectedParentTable, setSelectedParentTable] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [columnSearchTerm, setColumnSearchTerm] = useState<string>('');
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    field: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingCellPosition, setEditingCellPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const columnNameInputRef = useRef<HTMLInputElement>(null);

  // YAML Seed Data state
  const [yamlSeedData, setYamlSeedData] = useState<string>('');
  const [showSeedDataSuccess, setShowSeedDataSuccess] = useState<boolean>(false);

  // Parse YAML to JSON
  const parseYamlToJson = (
    yamlString: string,
  ): Record<string, unknown>[] | null => {
    try {
      if (!yamlString.trim()) {
        return null;
      }

      // Parse YAML using the yaml package
      const parsedData: unknown = yaml.parse(yamlString);

      if (!Array.isArray(parsedData)) {
        console.error('YAML data must be an array of records');
        return null;
      }

      // Validate that all items are objects
      const records = parsedData.filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null && !Array.isArray(item),
      );

      if (records.length !== parsedData.length) {
        console.error('All YAML items must be objects');
        return null;
      }

      return records;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return null;
    }
  };

  // Handle YAML input change
  const handleYamlChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    setYamlSeedData(e.target.value);
  };

  // Save seed data to table
  const handleSaveSeedData = (): void => {
    if (selectedTableIndex === null) {
      return;
    }

    const parsedData = parseYamlToJson(yamlSeedData);
    if (parsedData) {
      const updatedSchema = [...schemaInfo];
      updatedSchema[selectedTableIndex] = {
        ...updatedSchema[selectedTableIndex],
        data: parsedData,
      };
      setSchemaInfo(updatedSchema);
      
      // Show success indicator and hide after 2 seconds
      setShowSeedDataSuccess(true);
      setTimeout(() => {
        setShowSeedDataSuccess(false);
      }, 2000);
    } else {
      // Handle empty YAML - clear the data
      const updatedSchema = [...schemaInfo];
      updatedSchema[selectedTableIndex] = {
        ...updatedSchema[selectedTableIndex],
        data: undefined,
      };
      setSchemaInfo(updatedSchema);
      
      // Show success indicator and hide after 2 seconds
      setShowSeedDataSuccess(true);
      setTimeout(() => {
        setShowSeedDataSuccess(false);
      }, 2000);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.ctrlKey && e.key === 'Enter' && isFormValid()) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        form.dispatchEvent(
          new Event('submit', { cancelable: true, bubbles: true }),
        );
      }
    }
  };

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

  // Update YAML textarea when selected table changes
  useEffect(() => {
    if (
      selectedTableIndex !== null &&
      schemaInfo[selectedTableIndex] !== undefined
    ) {
      const table = schemaInfo[selectedTableIndex];
      if (table.data && Array.isArray(table.data)) {
        // Convert existing seed data back to YAML format
        const yamlString = yaml.stringify(table.data);
        setYamlSeedData(yamlString);
      } else {
        // Clear YAML textarea if no seed data exists
        setYamlSeedData('');
      }
    }
  }, [selectedTableIndex, schemaInfo]);

  const pivotTables = schemaInfo.filter((table) => table.isPivot === true);

  const isStandaloneTable = (table: ITableInfo): boolean => {
    return (
      !table.isPivot &&
      (!table.hasOne || table.hasOne.length === 0) &&
      (!table.hasMany || table.hasMany.length === 0) &&
      (!table.belongsTo || table.belongsTo.length === 0) &&
      (!table.belongsToMany || table.belongsToMany.length === 0) &&
      (!table.foreignTables || table.foreignTables.length === 0) &&
      (!table.childTables || table.childTables.length === 0) &&
      (!table.pivotRelationships || table.pivotRelationships.length === 0)
    );
  };

  const standaloneTables = schemaInfo.filter(isStandaloneTable);
  const mainTables = schemaInfo.filter(
    (table) => !table.isPivot && !isStandaloneTable(table),
  );

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
    // Reset form
    setNewColumnFormData({
      columnName: '',
      dataType: 'string',
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

    // Focus the column name input after successful submission
    setTimeout(() => {
      columnNameInputRef.current?.focus();
    }, 100);
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

  const handleCellEdit = (
    rowIndex: number,
    field: string,
    currentValue: string | boolean,
    event: React.MouseEvent | React.KeyboardEvent,
  ): void => {
    setEditingCell({ rowIndex, field });
    setEditingValue(String(currentValue));

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    setEditingCellPosition({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
    });
  };

  const handleCellSave = (
    tableIndex: number,
    columnIndex: number,
    field: string,
  ): void => {
    if (!editingCell) {
      return;
    }

    const updatedSchemaInfo = [...schemaInfo];
    const column = updatedSchemaInfo[tableIndex].columnsInfo[columnIndex];

    switch (field) {
      case 'column_name':
        column.column_name = editingValue;
        break;
      case 'data_type':
        column.data_type = editingValue;
        break;
      case 'is_nullable':
        column.is_nullable = editingValue;
        break;
      case 'column_default':
        column.column_default = editingValue || null;
        break;
      case 'primary_key':
        column.primary_key = editingValue === 'true' ? true : undefined;
        break;
      case 'unique':
        column.unique = editingValue === 'true' ? true : undefined;
        break;
    }

    setSchemaInfo(updatedSchemaInfo);
    setEditingCell(null);
    setEditingValue('');
    setEditingCellPosition(null);
  };

  const handleCellCancel = (): void => {
    setEditingCell(null);
    setEditingValue('');
    setEditingCellPosition(null);
  };

  const getExistingPrimaryKeyColumn = (
    tableIndex: number,
    excludeColumnName?: string,
  ): string | null => {
    const table = schemaInfo[tableIndex];
    const primaryKeyColumn = table.columnsInfo.find(
      (col) =>
        col.primary_key === true && col.column_name !== excludeColumnName,
    );
    return primaryKeyColumn ? primaryKeyColumn.column_name : null;
  };

  const canEditPrimaryKey = (
    tableIndex: number,
    columnName: string,
  ): boolean => {
    const existingPrimaryKey = getExistingPrimaryKeyColumn(
      tableIndex,
      columnName,
    );
    return existingPrimaryKey === null;
  };

  const handleRemoveColumn = async (
    tableIndex: number,
    columnIndex: number,
  ) => {
    const table = schemaInfo[tableIndex];
    const column = table.columnsInfo[columnIndex];

    const result = await promptModal({
      title: `Remove "${column.column_name}" column?`,
      description: `Are you sure you want to remove the "${column.column_name}" column from the "${table.tableName}" table?`,
      trueText: 'Yes',
      falseText: 'No',
    });

    if (!result) {
      return;
    }

    const updatedSchema = [...schemaInfo];
    const updatedTable = { ...updatedSchema[tableIndex] };

    // Remove the column from the table
    updatedTable.columnsInfo = updatedTable.columnsInfo.filter(
      (_, index) => index !== columnIndex,
    );

    // If this column was a foreign key, clean up relationships
    if (column.foreign_key) {
      const foreignTableName = column.foreign_key.foreign_table_name;

      // Find the parent table
      const parentTableIndex = updatedSchema.findIndex(
        (t) => t.tableName === foreignTableName,
      );

      if (parentTableIndex !== -1) {
        const parentTable = { ...updatedSchema[parentTableIndex] };

        // Remove this table from parent's hasOne/hasMany arrays
        if (parentTable.hasOne) {
          parentTable.hasOne = parentTable.hasOne.filter(
            (t) => t !== table.tableName,
          );
        }
        if (parentTable.hasMany) {
          parentTable.hasMany = parentTable.hasMany.filter(
            (t) => t !== table.tableName,
          );
        }
        if (parentTable.childTables) {
          parentTable.childTables = parentTable.childTables.filter(
            (t) => t !== table.tableName,
          );
        }

        updatedSchema[parentTableIndex] = parentTable;
      }

      // Remove foreign table from this table's relationships
      if (updatedTable.belongsTo) {
        updatedTable.belongsTo = updatedTable.belongsTo.filter(
          (t) => t !== foreignTableName,
        );
      }
      if (updatedTable.foreignTables) {
        updatedTable.foreignTables = updatedTable.foreignTables.filter(
          (t) => t !== foreignTableName,
        );
      }
    }

    updatedSchema[tableIndex] = updatedTable;
    setSchemaInfo(updatedSchema);
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
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Tables Created
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Get started by creating your first database table. Define your
              schema structure and relationships to build your
              application&apos;s data model.
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
                <span>
                  Click &quot;Add Table&quot; to create your first table
                </span>
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
            {/* Search/Filter Input */}
            <div className="mb-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
              <div className="flex items-center mb-4">
                <svg
                  className="w-5 h-5 text-blue-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-white">
                  Main Tables
                </h2>
                <span className="ml-auto bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                  {mainTables.length}
                </span>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2">
                {mainTables
                  .filter((table) =>
                    table.tableName
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()),
                  )
                  .map((tableInfo) => {
                    const { tableName } = tableInfo;
                    const tableIndex = schemaInfo.findIndex(
                      ({ tableName: currentTable }) =>
                        currentTable === tableName,
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
                          <svg
                            className={`w-4 h-4 mr-2 ${isSelected ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 5a2 2 0 012-2h2a2 2 0 012 2v0H8v0z"
                            />
                          </svg>
                          <span className="font-medium">{tableName}</span>
                          {isSelected && (
                            <svg
                              className="w-3 h-3 ml-auto text-indigo-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {standaloneTables.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4">
                <div className="flex items-center mb-4">
                  <svg
                    className="w-5 h-5 text-yellow-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">
                    Standalone Tables
                  </h2>
                  <span className="ml-auto bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">
                    {standaloneTables.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2">
                  {standaloneTables
                    .filter((table) =>
                      table.tableName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()),
                    )
                    .map((tableInfo) => {
                      const { tableName } = tableInfo;
                      const tableIndex = schemaInfo.findIndex(
                        ({ tableName: currentTable }) =>
                          currentTable === tableName,
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
                              ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300'
                              : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedTableIndex(tableIndex);
                          }}
                        >
                          <div className="flex items-center">
                            <svg
                              className={`w-4 h-4 mr-2 ${isSelected ? 'text-yellow-400' : 'text-gray-500 group-hover:text-gray-400'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="font-medium">{tableName}</span>
                            {isSelected && (
                              <svg
                                className="w-3 h-3 ml-auto text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {pivotTables.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4">
                <div className="flex items-center mb-4">
                  <svg
                    className="w-5 h-5 text-purple-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <h2 className="text-lg font-semibold text-white">
                    Pivot Tables
                  </h2>
                  <span className="ml-auto bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full">
                    {pivotTables.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2">
                  {schemaInfo
                    .filter((table) => table.isPivot === true)
                    .filter((table) =>
                      table.tableName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()),
                    )
                    .map((tableInfo) => {
                      const { tableName } = tableInfo;
                      const tableIndex = schemaInfo.findIndex(
                        ({ tableName: currentTable }) =>
                          currentTable === tableName,
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
                            <svg
                              className={`w-4 h-4 mr-2 ${isSelected ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-400'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium">{tableName}</span>
                            {isSelected && (
                              <svg
                                className="w-3 h-3 ml-auto text-purple-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
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
                                  <span className="text-blue-300">
                                    Has One:
                                  </span>
                                  <button
                                    onClick={() => {
                                      const tableIndex = schemaInfo.findIndex(
                                        (t) => t.tableName === table,
                                      );
                                      if (tableIndex !== -1) {
                                        setSelectedTableIndex(tableIndex);
                                      }
                                    }}
                                    className="ml-2 font-medium text-blue-200 hover:text-blue-100 hover:underline cursor-pointer transition-colors duration-200"
                                  >
                                    {table}
                                  </button>
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
                                    <button
                                      onClick={() => {
                                        const tableIndex = schemaInfo.findIndex(
                                          (t) => t.tableName === table,
                                        );
                                        if (tableIndex !== -1) {
                                          setSelectedTableIndex(tableIndex);
                                        }
                                      }}
                                      className="ml-2 font-medium text-blue-200 hover:text-blue-100 hover:underline cursor-pointer transition-colors duration-200"
                                    >
                                      {table}
                                    </button>
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
                                  <button
                                    onClick={() => {
                                      const tableIndex = schemaInfo.findIndex(
                                        (t) => t.tableName === table,
                                      );
                                      if (tableIndex !== -1) {
                                        setSelectedTableIndex(tableIndex);
                                      }
                                    }}
                                    className="ml-2 font-medium text-green-200 hover:text-green-100 hover:underline cursor-pointer transition-colors duration-200"
                                  >
                                    {table}
                                  </button>
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
                                  <button
                                    onClick={() => {
                                      const tableIndex = schemaInfo.findIndex(
                                        (t) => t.tableName === table,
                                      );
                                      if (tableIndex !== -1) {
                                        setSelectedTableIndex(tableIndex);
                                      }
                                    }}
                                    className="ml-2 font-medium text-purple-200 hover:text-purple-100 hover:underline cursor-pointer transition-colors duration-200"
                                  >
                                    {table}
                                  </button>
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
                                  <button
                                    onClick={() => {
                                      const tableIndex = schemaInfo.findIndex(
                                        (t) => t.tableName === rel.relatedTable,
                                      );
                                      if (tableIndex !== -1) {
                                        setSelectedTableIndex(tableIndex);
                                      }
                                    }}
                                    className="text-purple-200 hover:text-purple-100 hover:underline cursor-pointer transition-colors duration-200"
                                  >
                                    {rel.relatedTable}
                                  </button>
                                  <span className="text-purple-300 mx-2">
                                    via
                                  </span>
                                  <button
                                    onClick={() => {
                                      const tableIndex = schemaInfo.findIndex(
                                        (t) => t.tableName === rel.pivotTable,
                                      );
                                      if (tableIndex !== -1) {
                                        setSelectedTableIndex(tableIndex);
                                      }
                                    }}
                                    className="text-purple-200 hover:text-purple-100 hover:underline cursor-pointer transition-colors duration-200"
                                  >
                                    {rel.pivotTable}
                                  </button>
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
                            {schemaInfo[selectedTableIndex].foreignTables
                              .length > 0 && (
                              <li className="flex items-center">
                                <span className="text-gray-300">
                                  Foreign Tables:
                                </span>
                                <span className="ml-2 font-medium">
                                  {schemaInfo[
                                    selectedTableIndex
                                  ].foreignTables?.map((table, index) => (
                                    <span key={table}>
                                      <button
                                        onClick={() => {
                                          const tableIndex =
                                            schemaInfo.findIndex(
                                              (t) => t.tableName === table,
                                            );
                                          if (tableIndex !== -1) {
                                            setSelectedTableIndex(tableIndex);
                                          }
                                        }}
                                        className="text-gray-200 hover:text-gray-100 hover:underline cursor-pointer transition-colors duration-200"
                                      >
                                        {table}
                                      </button>
                                      {index <
                                        (schemaInfo[selectedTableIndex]
                                          .foreignTables?.length ?? 0) -
                                          1 && ', '}
                                    </span>
                                  ))}
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
                                  ].childTables?.map((table, index) => (
                                    <span key={table}>
                                      <button
                                        onClick={() => {
                                          const tableIndex =
                                            schemaInfo.findIndex(
                                              (t) => t.tableName === table,
                                            );
                                          if (tableIndex !== -1) {
                                            setSelectedTableIndex(tableIndex);
                                          }
                                        }}
                                        className="text-gray-200 hover:text-gray-100 hover:underline cursor-pointer transition-colors duration-200"
                                      >
                                        {table}
                                      </button>
                                      {index <
                                        (schemaInfo[selectedTableIndex]
                                          .childTables?.length ?? 0) -
                                          1 && ', '}
                                    </span>
                                  ))}
                                </span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                  </div>

                  <>
                    <br />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">
                        Columns (
                        {
                          schemaInfo[selectedTableIndex].columnsInfo.filter(
                            (column) =>
                              column.column_name
                                .toLowerCase()
                                .includes(columnSearchTerm.toLowerCase()) ||
                              column.data_type
                                .toLowerCase()
                                .includes(columnSearchTerm.toLowerCase()),
                          ).length
                        }
                        )
                      </h3>

                      <div className="flex-1 max-w-xs ml-4">
                        <div className="relative">
                          <svg
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search columns..."
                            value={columnSearchTerm}
                            onChange={(e) => {
                              setColumnSearchTerm(e.target.value);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-gray-700/90 backdrop-blur-sm">
                            <tr>
                              <th className="border border-gray-600 px-2 py-1 w-12 text-center">
                                #
                              </th>
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
                              <th className="border border-gray-600 px-2 py-1 w-16 text-center">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {schemaInfo[selectedTableIndex].columnsInfo
                              .filter(
                                (column) =>
                                  column.column_name
                                    .toLowerCase()
                                    .includes(columnSearchTerm.toLowerCase()) ||
                                  column.data_type
                                    .toLowerCase()
                                    .includes(columnSearchTerm.toLowerCase()),
                              )
                              .map((column, filteredIndex) => {
                                const originalIndex = schemaInfo[
                                  selectedTableIndex
                                ].columnsInfo.findIndex(
                                  (col) =>
                                    col.column_name === column.column_name,
                                );
                                return (
                                  <tr key={column.column_name}>
                                    {/* Icons Column */}
                                    <td className="border border-gray-600 px-2 py-1 text-center">
                                      <div className="flex items-center justify-center space-x-1">
                                        {column.primary_key && (
                                          <span
                                            className="text-yellow-400 text-sm"
                                            title="Primary Key"
                                          >
                                            🔑
                                          </span>
                                        )}
                                        {column.unique &&
                                          !column.primary_key && (
                                            <span
                                              className="text-blue-400 text-sm"
                                              title="Unique"
                                            >
                                              ⭐
                                            </span>
                                          )}
                                        {column.foreign_key && (
                                          <span
                                            className="text-green-400 text-sm"
                                            title={`Foreign Key: ${column.foreign_key.foreign_table_name}.${column.foreign_key.foreign_column_name}`}
                                          >
                                            🔗
                                          </span>
                                        )}
                                        {column.is_nullable === 'NO' &&
                                          !column.primary_key && (
                                            <span
                                              className="text-red-400 text-xs"
                                              title="Not Nullable"
                                            >
                                              !
                                            </span>
                                          )}
                                      </div>
                                    </td>

                                    {/* Column Name */}
                                    <td className="border border-gray-600 px-2 py-1 relative">
                                      {editingCell?.rowIndex ===
                                        filteredIndex &&
                                      editingCell?.field === 'column_name' ? (
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => {
                                            setEditingValue(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleCellSave(
                                                selectedTableIndex,
                                                originalIndex,
                                                'column_name',
                                              );
                                            } else if (e.key === 'Escape') {
                                              handleCellCancel();
                                            }
                                          }}
                                          className="w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      ) : (
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          className="cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5"
                                          onDoubleClick={(e) => {
                                            handleCellEdit(
                                              filteredIndex,
                                              'column_name',
                                              column.column_name,
                                              e,
                                            );
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === 'Enter' ||
                                              e.key === ' '
                                            ) {
                                              handleCellEdit(
                                                filteredIndex,
                                                'column_name',
                                                column.column_name,
                                                e,
                                              );
                                            }
                                          }}
                                        >
                                          {column.column_name}
                                        </div>
                                      )}
                                    </td>

                                    {/* Data Type */}
                                    <td className="border border-gray-600 px-2 py-1 relative">
                                      {editingCell?.rowIndex ===
                                        filteredIndex &&
                                      editingCell?.field === 'data_type' ? (
                                        <select
                                          value={editingValue}
                                          onChange={(e) => {
                                            setEditingValue(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleCellSave(
                                                selectedTableIndex,
                                                originalIndex,
                                                'data_type',
                                              );
                                            } else if (e.key === 'Escape') {
                                              handleCellCancel();
                                            }
                                          }}
                                          className="w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                          <option value="string">String</option>
                                          <option value="number">Number</option>
                                          <option value="Date">Date</option>
                                          <option value="boolean">
                                            Boolean
                                          </option>
                                        </select>
                                      ) : (
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          className="cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5"
                                          onDoubleClick={(e) => {
                                            handleCellEdit(
                                              filteredIndex,
                                              'data_type',
                                              column.data_type,
                                              e,
                                            );
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === 'Enter' ||
                                              e.key === ' '
                                            ) {
                                              handleCellEdit(
                                                filteredIndex,
                                                'data_type',
                                                column.data_type,
                                                e,
                                              );
                                            }
                                          }}
                                        >
                                          {column.data_type}
                                        </div>
                                      )}
                                    </td>

                                    {/* Nullable */}
                                    <td className="border border-gray-600 px-2 py-1 relative">
                                      {editingCell?.rowIndex ===
                                        filteredIndex &&
                                      editingCell?.field === 'is_nullable' ? (
                                        <select
                                          value={editingValue}
                                          onChange={(e) => {
                                            setEditingValue(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleCellSave(
                                                selectedTableIndex,
                                                originalIndex,
                                                'is_nullable',
                                              );
                                            } else if (e.key === 'Escape') {
                                              handleCellCancel();
                                            }
                                          }}
                                          className="w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                          <option value="YES">YES</option>
                                          <option value="NO">NO</option>
                                        </select>
                                      ) : (
                                        (() => {
                                          if (column.primary_key === true) {
                                            return (
                                              <div
                                                className="px-1 py-0.5 text-gray-500 cursor-not-allowed rounded"
                                                title="Primary keys are automatically NOT NULL"
                                              >
                                                NO
                                              </div>
                                            );
                                          }

                                          return (
                                            <div
                                              role="button"
                                              tabIndex={0}
                                              className="cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5"
                                              onDoubleClick={(e) => {
                                                handleCellEdit(
                                                  filteredIndex,
                                                  'is_nullable',
                                                  column.is_nullable,
                                                  e,
                                                );
                                              }}
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === 'Enter' ||
                                                  e.key === ' '
                                                ) {
                                                  handleCellEdit(
                                                    filteredIndex,
                                                    'is_nullable',
                                                    column.is_nullable,
                                                    e,
                                                  );
                                                }
                                              }}
                                            >
                                              {column.is_nullable}
                                            </div>
                                          );
                                        })()
                                      )}
                                    </td>

                                    {/* Default Value */}
                                    <td className="border border-gray-600 px-2 py-1 relative">
                                      {editingCell?.rowIndex ===
                                        filteredIndex &&
                                      editingCell?.field ===
                                        'column_default' ? (
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => {
                                            setEditingValue(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleCellSave(
                                                selectedTableIndex,
                                                originalIndex,
                                                'column_default',
                                              );
                                            } else if (e.key === 'Escape') {
                                              handleCellCancel();
                                            }
                                          }}
                                          className="w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                      ) : (
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          className="cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5"
                                          onDoubleClick={(e) => {
                                            handleCellEdit(
                                              filteredIndex,
                                              'column_default',
                                              getColumnDefaultDisplay({
                                                isPrimaryKey:
                                                  column.primary_key ?? false,
                                                isNullable: column.is_nullable,
                                                columnDefault:
                                                  column.column_default,
                                              }),
                                              e,
                                            );
                                          }}
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === 'Enter' ||
                                              e.key === ' '
                                            ) {
                                              handleCellEdit(
                                                filteredIndex,
                                                'column_default',
                                                getColumnDefaultDisplay({
                                                  isPrimaryKey:
                                                    column.primary_key ?? false,
                                                  isNullable:
                                                    column.is_nullable,
                                                  columnDefault:
                                                    column.column_default,
                                                }),
                                                e,
                                              );
                                            }
                                          }}
                                        >
                                          {getColumnDefaultDisplay({
                                            isPrimaryKey:
                                              column.primary_key ?? false,
                                            isNullable: column.is_nullable,
                                            columnDefault:
                                              column.column_default,
                                          })}
                                        </div>
                                      )}
                                    </td>

                                    {/* Primary Key */}
                                    <td className="border border-gray-600 px-2 py-1 relative">
                                      {editingCell?.rowIndex ===
                                        filteredIndex &&
                                      editingCell?.field === 'primary_key' ? (
                                        <select
                                          value={editingValue}
                                          onChange={(e) => {
                                            setEditingValue(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleCellSave(
                                                selectedTableIndex,
                                                originalIndex,
                                                'primary_key',
                                              );
                                            } else if (e.key === 'Escape') {
                                              handleCellCancel();
                                            }
                                          }}
                                          className="w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                          <option value="true">Yes</option>
                                          <option value="false">No</option>
                                        </select>
                                      ) : (
                                        (() => {
                                          const canEdit = canEditPrimaryKey(
                                            selectedTableIndex,
                                            column.column_name,
                                          );
                                          const isCurrentPrimaryKey =
                                            column.primary_key === true;
                                          const existingPrimaryKey =
                                            getExistingPrimaryKeyColumn(
                                              selectedTableIndex,
                                              column.column_name,
                                            );

                                          if (
                                            !canEdit &&
                                            !isCurrentPrimaryKey
                                          ) {
                                            return (
                                              <div
                                                className="px-1 py-0.5 text-gray-500 cursor-not-allowed rounded"
                                                title={`Cannot set as primary key. "${String(existingPrimaryKey)}" is already the primary key.`}
                                              >
                                                No
                                              </div>
                                            );
                                          }

                                          return (
                                            <div
                                              role="button"
                                              tabIndex={0}
                                              className="cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5"
                                              onDoubleClick={(e) => {
                                                handleCellEdit(
                                                  filteredIndex,
                                                  'primary_key',
                                                  column.primary_key
                                                    ? 'true'
                                                    : 'false',
                                                  e,
                                                );
                                              }}
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === 'Enter' ||
                                                  e.key === ' '
                                                ) {
                                                  handleCellEdit(
                                                    filteredIndex,
                                                    'primary_key',
                                                    column.primary_key
                                                      ? 'true'
                                                      : 'false',
                                                    e,
                                                  );
                                                }
                                              }}
                                            >
                                              {column.primary_key
                                                ? 'Yes'
                                                : 'No'}
                                            </div>
                                          );
                                        })()
                                      )}
                                    </td>

                                    {/* Unique */}
                                    <td className="border border-gray-600 px-2 py-1 relative">
                                      {editingCell?.rowIndex ===
                                        filteredIndex &&
                                      editingCell?.field === 'unique' ? (
                                        <select
                                          value={editingValue}
                                          onChange={(e) => {
                                            setEditingValue(e.target.value);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleCellSave(
                                                selectedTableIndex,
                                                originalIndex,
                                                'unique',
                                              );
                                            } else if (e.key === 'Escape') {
                                              handleCellCancel();
                                            }
                                          }}
                                          className="w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                          <option value="true">Yes</option>
                                          <option value="false">No</option>
                                        </select>
                                      ) : (
                                        (() => {
                                          if (column.primary_key === true) {
                                            return (
                                              <div
                                                className="px-1 py-0.5 text-gray-500 cursor-not-allowed rounded"
                                                title="Primary keys are automatically UNIQUE"
                                              >
                                                Yes
                                              </div>
                                            );
                                          }

                                          return (
                                            <div
                                              role="button"
                                              tabIndex={0}
                                              className="cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5"
                                              onDoubleClick={(e) => {
                                                handleCellEdit(
                                                  filteredIndex,
                                                  'unique',
                                                  column.unique
                                                    ? 'true'
                                                    : 'false',
                                                  e,
                                                );
                                              }}
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === 'Enter' ||
                                                  e.key === ' '
                                                ) {
                                                  handleCellEdit(
                                                    filteredIndex,
                                                    'unique',
                                                    column.unique
                                                      ? 'true'
                                                      : 'false',
                                                    e,
                                                  );
                                                }
                                              }}
                                            >
                                              {column.unique ? 'Yes' : 'No'}
                                            </div>
                                          );
                                        })()
                                      )}
                                    </td>

                                    {/* Foreign Key - Read Only for now */}
                                    <td className="border border-gray-600 px-2 py-1">
                                      <div className="text-gray-400">
                                        {column.foreign_key
                                          ? `${column.foreign_key.foreign_column_name} (${column.foreign_key.foreign_table_name})`
                                          : 'None'}
                                      </div>
                                    </td>

                                    {/* Actions - Delete Column */}
                                    <td className="border border-gray-600 px-2 py-1 text-center">
                                      <button
                                        onClick={() => {
                                          void (async () => {
                                            await handleRemoveColumn(
                                              selectedTableIndex,
                                              originalIndex,
                                            );
                                          })();
                                        }}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded p-1 transition-colors duration-200"
                                        title={`Remove ${column.column_name} column`}
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Floating Edit Controls */}
                    {editingCell && editingCellPosition && (
                      <div
                        className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 flex gap-2"
                        style={{
                          top: `${String(editingCellPosition.top)}px`,
                          left: `${String(editingCellPosition.left)}px`,
                        }}
                      >
                        <button
                          onClick={() => {
                            if (selectedTableIndex !== null) {
                              const originalIndex = schemaInfo[
                                selectedTableIndex
                              ].columnsInfo.findIndex(
                                (col) =>
                                  col.column_name ===
                                  schemaInfo[
                                    selectedTableIndex
                                  ].columnsInfo.filter(
                                    (column) =>
                                      column.column_name
                                        .toLowerCase()
                                        .includes(
                                          columnSearchTerm.toLowerCase(),
                                        ) ||
                                      column.data_type
                                        .toLowerCase()
                                        .includes(
                                          columnSearchTerm.toLowerCase(),
                                        ),
                                  )[editingCell.rowIndex]?.column_name,
                              );
                              if (originalIndex !== -1) {
                                handleCellSave(
                                  selectedTableIndex,
                                  originalIndex,
                                  editingCell.field,
                                );
                              }
                            }
                          }}
                          className="flex items-center justify-center w-8 h-8 bg-green-600 hover:bg-green-500 text-white rounded transition-colors duration-200"
                          title="Save changes"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCellCancel}
                          className="flex items-center justify-center w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded transition-colors duration-200"
                          title="Cancel changes"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Add Column Form - Always Visible - Below Table */}
                    {(schemaInfo[selectedTableIndex].isPivot !== true ||
                      isPivotTableColumnsEditable) && (
                      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4">
                        <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                          <svg
                            className="w-5 h-5 mr-2 text-indigo-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Add New Column
                        </h4>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label
                                  htmlFor="columnName"
                                  className="block text-sm font-medium text-gray-300 mb-1"
                                >
                                  Column Name{' '}
                                  <span className="text-red-400">*</span>
                                </label>
                                <input
                                  ref={columnNameInputRef}
                                  id="columnName"
                                  name="columnName"
                                  type="text"
                                  value={newColumnFormData.columnName}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  placeholder="Enter name"
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                  required
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="dataType"
                                  className="block text-sm font-medium text-gray-300 mb-1"
                                >
                                  Data Type
                                  {/* Data Type <span className="text-red-400">*</span> */}
                                </label>
                                <select
                                  id="dataType"
                                  name="dataType"
                                  value={newColumnFormData.dataType}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                  required
                                >
                                  {/* <option value="">Type</option> */}
                                  <option value="string">String</option>
                                  <option value="number">Number</option>
                                  <option value="Date">Date</option>
                                  <option value="boolean">Boolean</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label
                                  htmlFor="defaultValue"
                                  className="block text-sm font-medium text-gray-300 mb-1"
                                >
                                  Default Value
                                </label>
                                <input
                                  id="defaultValue"
                                  name="defaultValue"
                                  type="text"
                                  value={newColumnFormData.defaultValue}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  placeholder="Optional"
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor="foreignKey"
                                  className="block text-sm font-medium text-gray-300 mb-1"
                                >
                                  Foreign Key
                                </label>
                                <select
                                  id="foreignKey"
                                  name="foreignKey"
                                  value={
                                    newColumnFormData.foreignKey?.tableName ??
                                    ''
                                  }
                                  onChange={handleForeignKeyChange}
                                  onKeyDown={handleKeyDown}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                >
                                  <option value="">None</option>
                                  {selectedTableIndex &&
                                    getAvailableForeignTables(
                                      schemaInfo[selectedTableIndex],
                                    ).map((tableName) => (
                                      <option key={tableName} value={tableName}>
                                        {tableName}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  name="isNullable"
                                  type="checkbox"
                                  checked={newColumnFormData.isNullable}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-300">
                                  Nullable
                                </span>
                              </label>

                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  name="isPrimary"
                                  type="checkbox"
                                  checked={newColumnFormData.isPrimary}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-300">
                                  Primary
                                </span>
                              </label>

                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  name="isUnique"
                                  type="checkbox"
                                  checked={newColumnFormData.isUnique}
                                  onChange={handleInputChange}
                                  onKeyDown={handleKeyDown}
                                  className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-300">
                                  Unique
                                </span>
                              </label>
                            </div>

                            {newColumnFormData.foreignKey && (
                              <div>
                                <select
                                  id="relationType"
                                  name="relationType"
                                  value={
                                    newColumnFormData.foreignKey.relationType
                                  }
                                  onChange={handleRelationTypeChange}
                                  onKeyDown={handleKeyDown}
                                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                  required
                                >
                                  <option value="">Relationship</option>
                                  <option value="oneToOne">One-to-One</option>
                                  <option value="oneToMany">One-to-Many</option>
                                </select>
                              </div>
                            )}

                            {isFormValid() && (
                              <div className="ml-auto flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                  Ctrl + Enter
                                </span>
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                                >
                                  Add Column
                                </button>
                              </div>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Seed Data Section */}
                    {(schemaInfo[selectedTableIndex].isPivot !== true ||
                      isPivotTableColumnsEditable) && (
                      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4">
                        <h4 className="text-lg font-medium text-white mb-4 flex items-center">
                          <svg
                            className="w-5 h-5 mr-2 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7h16M4 7l1-4h14l1 4M9 11v6m6-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Seed Data (YAML)
                        </h4>

                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor="yamlSeedData"
                              className="block text-sm font-medium text-gray-300 mb-2"
                            >
                              Sample Data for{' '}
                              {schemaInfo[selectedTableIndex].tableName} table
                            </label>
                            <p className="text-xs text-gray-400 mb-3">
                              Enter sample data in YAML format. Example: user
                              types (superadmin, admin, user), product
                              categories, etc.
                            </p>
                            <textarea
                              id="yamlSeedData"
                              value={yamlSeedData}
                              onChange={handleYamlChange}
                              placeholder={`- user_id: 1
  first_name: "John"
  last_name: "Doe"
  email: "john@example.com"
  role: "admin"
  created_at: "2024-01-01T00:00:00.000Z"
- user_id: 2
  first_name: "Jane"
  last_name: "Smith"
  email: "jane@example.com"
  role: "user"
  created_at: "2024-01-02T00:00:00.000Z"`}
                              className="w-full h-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono resize-vertical"
                              style={{ minHeight: '160px' }}
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSaveSeedData}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                            >
                              Save Seed Data
                            </button>

                            {showSeedDataSuccess && schemaInfo[selectedTableIndex].data && (
                              <span className="text-sm text-green-400">
                                ✓ Seed data saved (
                                {schemaInfo[selectedTableIndex].data.length ||
                                  0}{' '}
                                records)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
