import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  addRelationship,
  purgeForeignKeyTraces,
} from '../helpers/relationshipHelper';
import { useModalStore } from '../components/Modal/base/modalStore';
import { Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
import { getColumnDefaultDisplay, getPrimaryKey } from '../utils/common';
import TableAdder from '../components/TableAdder';
import renameTable from '../utils/renameTable';
import useTransformationsStore from '../useTransformationsStore';
import yaml from 'yaml';
import DataTypeSelector from '../components/DataTypeSelector';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { useMockDatabaseStore } from '../useMockDatabaseStore';
import { useFormStore } from '../useFormStore';
function SchemaBuilder() {
  const isPivotTableColumnsEditable = true;
  const { schemaInfo, setSchemaInfo } = useTransformationsStore();
  const { promptModal, newValue, editValue } = useModalStore();
  const [newColumnFormData, setNewColumnFormData] = useState({
    columnName: '',
    dataType: 'string',
    isNullable: false,
    defaultValue: '',
    isPrimary: false,
    isUnique: false,
    foreignKey: null,
  });
  const [_selectedParentTable, setSelectedParentTable] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 250);
  const [debouncedColumnSearchTerm] = useDebouncedValue(columnSearchTerm, 250);
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [columnValidationError, setColumnValidationError] = useState(null);
  const columnNameInputRef = useRef(null);
  const { typeMappings: customTypeMappings } = useMockDatabaseStore();
  const { dbType } = useFormStore();
  const isRecordWithStringValues = (value) => {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    );
  };
  const getDatabaseType = useCallback(
    (dataType) => {
      const currentDbType = dbType;
      const hasValidDbType =
        currentDbType !== undefined &&
        (() => {
          const dbTypes = useMockDatabaseStore.getState().dbTypes;
          return (
            dbTypes !== undefined &&
            dbTypes.length > 0 &&
            dbTypes.includes(currentDbType)
          );
        })();
      if (!hasValidDbType) {
        return dataType;
      }
      const typeMappings = useMockDatabaseStore.getState().typeMappings;
      const isRecord = (value) => {
        return (
          value !== null && typeof value === 'object' && !Array.isArray(value)
        );
      };
      if (typeMappings && isRecord(typeMappings) && dataType in typeMappings) {
        const coreTypeMapping = typeMappings[dataType];
        if (
          isRecord(coreTypeMapping) &&
          currentDbType in coreTypeMapping &&
          typeof coreTypeMapping[currentDbType] === 'string'
        ) {
          return coreTypeMapping[currentDbType];
        }
      }
      const hasCustomMappings = customTypeMappings !== undefined;
      if (hasCustomMappings && dataType in customTypeMappings) {
        const customTypeMapping = customTypeMappings[dataType];
        if (
          isRecordWithStringValues(customTypeMapping) &&
          currentDbType in customTypeMapping
        ) {
          const dbTypeValue = customTypeMapping[currentDbType];
          return typeof dbTypeValue === 'string' ? dbTypeValue : dataType;
        }
      }
      return dataType;
    },
    [customTypeMappings, dbType],
  );
  const getTypeScriptType = useCallback(
    (dataType) => {
      const typeMappings = useMockDatabaseStore.getState().typeMappings;
      const isRecord = (value) => {
        return (
          value !== null && typeof value === 'object' && !Array.isArray(value)
        );
      };
      if (typeMappings && isRecord(typeMappings) && dataType in typeMappings) {
        const coreTypeMapping = typeMappings[dataType];
        if (isRecord(coreTypeMapping) && 'typescript' in coreTypeMapping) {
          const tsType = coreTypeMapping.typescript;
          if (
            typeof tsType === 'string' &&
            (tsType === 'string' ||
              tsType === 'number' ||
              tsType === 'float' ||
              tsType === 'boolean' ||
              tsType === 'Date')
          ) {
            return tsType;
          }
        }
      }
      const hasCustomMappings = customTypeMappings !== undefined;
      if (hasCustomMappings && dataType in customTypeMappings) {
        const customTypeMapping = customTypeMappings[dataType];
        if (
          customTypeMapping !== null &&
          typeof customTypeMapping === 'object' &&
          'typescript' in customTypeMapping
        ) {
          const tsType = customTypeMapping.typescript;
          if (
            typeof tsType === 'string' &&
            (tsType === 'string' ||
              tsType === 'number' ||
              tsType === 'float' ||
              tsType === 'boolean' ||
              tsType === 'Date')
          ) {
            return tsType;
          }
        }
      }
      return 'string';
    },
    [customTypeMappings],
  );
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  // YAML Seed Data state
  const [yamlSeedData, setYamlSeedData] = useState('');
  const [showSeedDataSuccess, setShowSeedDataSuccess] = useState(false);
  const validateColumnName = useCallback(
    (columnName) => {
      const isEmpty = !columnName.trim();
      if (isEmpty) {
        return { isValid: false, error: 'Column name is required' };
      }
      const isTooLong = columnName.length > 64;
      if (isTooLong) {
        return {
          isValid: false,
          error: 'Column name must be 64 characters or less',
        };
      }
      const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
      const isValidSnakeCase = snakeCaseRegex.test(columnName);
      if (!isValidSnakeCase) {
        return {
          isValid: false,
          error:
            'Column name must be in snake_case format (lowercase letters, numbers, and underscores only)',
        };
      }
      const noTableSelected = selectedTableIndex === null;
      if (noTableSelected) {
        return { isValid: true, error: null };
      }
      const existingColumns = schemaInfo[selectedTableIndex].columnsInfo;
      const isDuplicateName = existingColumns.some(
        (col) => col.column_name.toLowerCase() === columnName.toLowerCase(),
      );
      if (isDuplicateName) {
        return {
          isValid: false,
          error: `Column "${columnName}" already exists in this table`,
        };
      }
      return { isValid: true, error: null };
    },
    [schemaInfo, selectedTableIndex],
  );
  const validateDataType = useCallback(
    (dataType) => {
      const isEmpty = !dataType.trim();
      if (isEmpty) {
        return { isValid: false, error: 'Data type is required' };
      }
      const typeMappings = useMockDatabaseStore.getState().typeMappings;
      const coreTypeMappingsKeys =
        typeMappings && typeof typeMappings === 'object'
          ? Object.keys(typeMappings)
          : [];
      const hasCustomMappings = customTypeMappings !== undefined;
      const customTypeMappingsKeys = hasCustomMappings
        ? Object.keys(customTypeMappings)
        : [];
      const allValidTypes = [
        ...new Set([...coreTypeMappingsKeys, ...customTypeMappingsKeys]),
      ];
      const isValidType = allValidTypes.includes(dataType);
      if (!isValidType) {
        return {
          isValid: false,
          error: `Invalid data type "${dataType}". Please select a valid type from the dropdown.`,
        };
      }
      return { isValid: true, error: null };
    },
    [customTypeMappings],
  );
  // Parse YAML to JSON
  const parseYamlToJson = (yamlString) => {
    try {
      if (!yamlString.trim()) {
        return null;
      }
      // Parse YAML using the yaml package
      const parsedData = yaml.parse(yamlString);
      if (!Array.isArray(parsedData)) {
        console.error('YAML data must be an array of records');
        return null;
      }
      // Validate that all items are objects
      const records = parsedData.filter(
        (item) =>
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
  const handleYamlChange = useCallback((e) => {
    setYamlSeedData(e.target.value);
  }, []);
  // Save seed data to table
  const handleSaveSeedData = useCallback(() => {
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
  }, [schemaInfo, selectedTableIndex, setSchemaInfo, yamlSeedData]);
  // Add new empty row to YAML
  const handleAddNewRow = useCallback(() => {
    if (selectedTableIndex === null) {
      return;
    }
    const table = schemaInfo[selectedTableIndex];
    if (table.columnsInfo.length === 0) {
      return;
    }
    // Create empty row with all column names
    const emptyRow = table.columnsInfo
      .map((col) => {
        return `  ${col.column_name}: `;
      })
      .join('\n');
    const newRowYaml = `- ${emptyRow.replace(/^ {2}/, '')}`;
    // Add to existing YAML or create new
    const updatedYaml = yamlSeedData.trim()
      ? `${yamlSeedData}\n${newRowYaml}`
      : newRowYaml;
    setYamlSeedData(updatedYaml);
  }, [schemaInfo, selectedTableIndex, yamlSeedData]);
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        const valid = Boolean(
          newColumnFormData.columnName.trim() &&
            newColumnFormData.dataType &&
            (!newColumnFormData.foreignKey ||
              newColumnFormData.foreignKey.relationType),
        );
        if (!valid) {
          return;
        }
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (form) {
          form.dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true }),
          );
        }
      }
    },
    [newColumnFormData],
  );
  const handleInputChange = useCallback(
    (e) => {
      const { name, value, type } = e.target;
      const checked = e.target instanceof HTMLInputElement && e.target.checked;
      setNewColumnFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      const isColumnNameField = name === 'columnName';
      const isDataTypeField = name === 'dataType';
      if (isColumnNameField) {
        const validation = validateColumnName(value);
        setColumnValidationError(validation.error);
        return;
      }
      if (isDataTypeField) {
        const validation = validateDataType(value);
        const isValidDataType = validation.isValid;
        const hasDataTypeError = columnValidationError?.includes('data type');
        if (isValidDataType && hasDataTypeError === true) {
          setColumnValidationError(null);
          return;
        }
        if (!isValidDataType) {
          setColumnValidationError(validation.error);
        }
      }
    },
    [validateColumnName, validateDataType, columnValidationError],
  );
  const handleRenameTable = async (index) => {
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
  const handleAddRelationship = async (tableIndex, relationshipType) => {
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
  const handleRemoveRelationship = async (tableIndex) => {
    const sourceTable = schemaInfo[tableIndex];
    const result = await promptModal({
      title: `Remove "${sourceTable.tableName}" table?`,
      description: `Are you sure you want to remove "${sourceTable.tableName}" table and its dependent tables?`,
      confirmButtonText: 'Yes',
      denyButtonText: 'No',
    });
    if (!result) {
      return;
    }
    /* Define the relationship keys */
    const relationshipKeys = [
      'hasOne',
      'hasMany',
      'belongsTo',
      'belongsToMany',
      'foreignTables',
      'childTables',
    ];
    const pivotTablesFromRelationships =
      sourceTable.pivotRelationships !== undefined &&
      sourceTable.pivotRelationships !== null
        ? sourceTable.pivotRelationships.map((rel) => rel.pivotTable)
        : [];
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
      ...pivotTablesFromRelationships,
    ];
    /* Remove these tables and clean references */
    const updatedSchema = schemaInfo
      .filter((table) => !tablesToRemove.includes(table.tableName))
      .map((table) => {
        const updatedTable = { ...table };
        relationshipKeys.forEach((relation) => {
          const currentRelations = updatedTable[relation];
          if (currentRelations && Array.isArray(currentRelations)) {
            const relationsValue = currentRelations.filter(
              (rel) => !tablesToRemove.includes(rel),
            );
            updatedTable[relation] =
              relationsValue.length > 0 ? [...relationsValue] : undefined;
          }
        });
        if (updatedTable.pivotRelationships) {
          const pivotRelationships = updatedTable.pivotRelationships.filter(
            (rel) =>
              !tablesToRemove.includes(rel.relatedTable) &&
              !tablesToRemove.includes(rel.pivotTable),
          );
          updatedTable.pivotRelationships =
            pivotRelationships.length > 0 ? [...pivotRelationships] : undefined;
        }
        return cleanUpEmptyArrays(updatedTable);
      });
    setSchemaInfo(purgeForeignKeyTraces(updatedSchema));
  };
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
  const pivotTables = useMemo(() => {
    return schemaInfo.filter((table) => table.isPivot === true);
  }, [schemaInfo]);
  const isStandaloneTable = (table) => {
    const isPivotTable = table.isPivot === true;
    const hasOneToOneRelations =
      table.hasOne !== undefined && table.hasOne.length > 0;
    const hasOneToManyRelations =
      table.hasMany !== undefined && table.hasMany.length > 0;
    const hasBelongsToRelations =
      table.belongsTo !== undefined && table.belongsTo.length > 0;
    const hasManyToManyRelations =
      table.belongsToMany !== undefined && table.belongsToMany.length > 0;
    const hasForeignTables =
      table.foreignTables !== undefined && table.foreignTables.length > 0;
    const hasChildTables =
      table.childTables !== undefined && table.childTables.length > 0;
    const hasPivotRelationships =
      table.pivotRelationships !== undefined &&
      table.pivotRelationships.length > 0;
    const hasAnyRelationships =
      hasOneToOneRelations ||
      hasOneToManyRelations ||
      hasBelongsToRelations ||
      hasManyToManyRelations ||
      hasForeignTables ||
      hasChildTables ||
      hasPivotRelationships;
    return !isPivotTable && !hasAnyRelationships;
  };
  const standaloneTables = useMemo(() => {
    return schemaInfo.filter(isStandaloneTable);
  }, [schemaInfo]);
  const mainTables = useMemo(() => {
    return schemaInfo.filter(
      (table) => !table.isPivot && !isStandaloneTable(table),
    );
  }, [schemaInfo]);
  const addNewColumnToTable = useCallback(
    (columnData) => {
      const noTableSelected = selectedTableIndex === null;
      if (noTableSelected) {
        return false;
      }
      const columnNameValidation = validateColumnName(columnData.columnName);
      const isColumnNameValid = columnNameValidation.isValid;
      if (!isColumnNameValid) {
        setColumnValidationError(columnNameValidation.error);
        return false;
      }
      const dataTypeValidation = validateDataType(columnData.dataType);
      const isDataTypeValid = dataTypeValidation.isValid;
      if (!isDataTypeValid) {
        setColumnValidationError(dataTypeValidation.error);
        return false;
      }
      const updatedSchema = [...schemaInfo];
      const table = updatedSchema[selectedTableIndex];
      // Create the new column
      const newColumn = {
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
      const foreignKeyData = columnData.foreignKey;
      const hasForeignKey = foreignKeyData !== null;
      if (!hasForeignKey) {
        setSchemaInfo(updatedSchema);
        setColumnValidationError(null);
        setNewColumnFormData({
          columnName: '',
          dataType: 'string',
          isNullable: false,
          defaultValue: '',
          isPrimary: false,
          isUnique: false,
          foreignKey: null,
        });
        return true;
      }
      const foreignKeyTableName = foreignKeyData.tableName;
      const parentTableIndex = updatedSchema.findIndex(
        (t) => t.tableName === foreignKeyTableName,
      );
      const parentTableNotFound = parentTableIndex === -1;
      if (parentTableNotFound) {
        setSchemaInfo(updatedSchema);
        setColumnValidationError(null);
        setNewColumnFormData({
          columnName: '',
          dataType: 'string',
          isNullable: false,
          defaultValue: '',
          isPrimary: false,
          isUnique: false,
          foreignKey: null,
        });
        return true;
      }
      const parentTable = updatedSchema[parentTableIndex];
      const isOneToOneRelation = foreignKeyData.relationType === 'oneToOne';
      if (isOneToOneRelation) {
        const parentHasOneArray = parentTable.hasOne;
        const parentHasOneExists =
          parentHasOneArray !== undefined && parentHasOneArray !== null;
        const notAlreadyInParentHasOne =
          parentHasOneExists && !parentHasOneArray.includes(table.tableName);
        if (notAlreadyInParentHasOne) {
          parentHasOneArray.push(table.tableName);
        }
      }
      if (!isOneToOneRelation) {
        const parentHasManyArray = parentTable.hasMany;
        const parentHasManyExists =
          parentHasManyArray !== undefined && parentHasManyArray !== null;
        const notAlreadyInParentHasMany =
          parentHasManyExists && !parentHasManyArray.includes(table.tableName);
        if (notAlreadyInParentHasMany) {
          parentHasManyArray.push(table.tableName);
        }
      }
      const tableBelongsToArray = table.belongsTo;
      const tableBelongsToExists =
        tableBelongsToArray !== undefined && tableBelongsToArray !== null;
      const notAlreadyInBelongsTo =
        tableBelongsToExists &&
        !tableBelongsToArray.includes(foreignKeyTableName);
      if (notAlreadyInBelongsTo) {
        tableBelongsToArray.push(foreignKeyTableName);
      }
      const tableForeignTablesArray = table.foreignTables;
      const tableForeignTablesExists =
        tableForeignTablesArray !== undefined &&
        tableForeignTablesArray !== null;
      const notAlreadyInForeignTables =
        tableForeignTablesExists &&
        !tableForeignTablesArray.includes(foreignKeyTableName);
      if (notAlreadyInForeignTables) {
        tableForeignTablesArray.push(foreignKeyTableName);
      }
      const parentChildTablesArray = parentTable.childTables;
      const parentChildTablesExists =
        parentChildTablesArray !== undefined && parentChildTablesArray !== null;
      const notAlreadyInParentChildTables =
        parentChildTablesExists &&
        !parentChildTablesArray.includes(table.tableName);
      if (notAlreadyInParentChildTables) {
        parentChildTablesArray.push(table.tableName);
      }
      setSchemaInfo(updatedSchema);
      setColumnValidationError(null);
      setNewColumnFormData({
        columnName: '',
        dataType: 'string',
        isNullable: false,
        defaultValue: '',
        isPrimary: false,
        isUnique: false,
        foreignKey: null,
      });
      return true;
    },
    [
      schemaInfo,
      selectedTableIndex,
      setSchemaInfo,
      validateColumnName,
      validateDataType,
    ],
  );
  const handleForeignKeyChange = useCallback(
    (e) => {
      const { value } = e.target;
      try {
        setNewColumnFormData((prev) => ({
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
    },
    [schemaInfo],
  );
  const handleRelationTypeChange = useCallback((e) => {
    const { value } = e.target;
    if (value === 'oneToOne' || value === 'oneToMany') {
      setNewColumnFormData((prev) => ({
        ...prev,
        foreignKey: prev.foreignKey
          ? {
              ...prev.foreignKey,
              relationType: value,
            }
          : null,
      }));
    }
  }, []);
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const success = addNewColumnToTable(newColumnFormData);
      if (success) {
        setTimeout(() => {
          columnNameInputRef.current?.focus();
        }, 100);
      }
    },
    [addNewColumnToTable, newColumnFormData],
  );
  const getAvailableForeignTables = (currentTable) => {
    const existingForeignTables = new Set();
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
  const isFormValid = () => {
    const hasValidationError =
      columnValidationError !== null && columnValidationError !== undefined;
    if (hasValidationError) {
      return false;
    }
    const columnNameValidation = validateColumnName(
      newColumnFormData.columnName,
    );
    const dataTypeValidation = validateDataType(newColumnFormData.dataType);
    const isColumnNameValid = columnNameValidation.isValid;
    const isDataTypeValid = dataTypeValidation.isValid;
    const hasColumnName = newColumnFormData.columnName.trim().length > 0;
    const hasDataType = newColumnFormData.dataType.length > 0;
    const hasForeignKey = newColumnFormData.foreignKey !== null;
    const hasRelationType =
      hasForeignKey &&
      newColumnFormData.foreignKey !== null &&
      newColumnFormData.foreignKey.relationType.length > 0;
    const isForeignKeyValid = !hasForeignKey || hasRelationType;
    return (
      isColumnNameValid &&
      isDataTypeValid &&
      hasColumnName &&
      hasDataType &&
      isForeignKeyValid
    );
  };
  const handleCellEdit = useCallback(
    (rowIndex, field, currentValue, _event, originalIndex) => {
      setEditingCell({ rowIndex, field, originalIndex });
      setEditingValue(String(currentValue));
    },
    [],
  );
  const validateAndSaveColumnName = useCallback(
    (column, tableIndex, columnIndex) => {
      const existingColumns = schemaInfo[tableIndex].columnsInfo;
      const isDuplicateName = existingColumns.some(
        (col, idx) =>
          idx !== columnIndex &&
          col.column_name.toLowerCase() === editingValue.toLowerCase(),
      );
      if (isDuplicateName) {
        void promptModal({
          title: 'Duplicate Column Name',
          description: `Column name "${editingValue}" already exists in this table. Please choose a different name.`,
          confirmButtonText: 'OK',
          denyButtonText: 'Cancel',
        });
        return false;
      }
      const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
      const isValidSnakeCase = snakeCaseRegex.test(editingValue);
      if (!isValidSnakeCase) {
        void promptModal({
          title: 'Invalid Column Name',
          description:
            'Column name must be in snake_case format (lowercase letters, numbers, and underscores only).',
          confirmButtonText: 'OK',
          denyButtonText: 'Cancel',
        });
        return false;
      }
      column.column_name = editingValue;
      return true;
    },
    [schemaInfo, editingValue, promptModal],
  );
  const validateAndSaveDataType = useCallback(
    (column) => {
      const typeMappings = useMockDatabaseStore.getState().typeMappings;
      const coreTypeMappingsKeys =
        typeMappings && typeof typeMappings === 'object'
          ? Object.keys(typeMappings)
          : [];
      const customTypeMappingsKeys =
        customTypeMappings !== undefined ? Object.keys(customTypeMappings) : [];
      const allValidTypes = [
        ...new Set([...coreTypeMappingsKeys, ...customTypeMappingsKeys]),
      ];
      const isValidType = allValidTypes.includes(editingValue);
      if (!isValidType) {
        void promptModal({
          title: 'Invalid Data Type',
          description: `Invalid data type "${editingValue}". Please select a valid type.`,
          confirmButtonText: 'OK',
          denyButtonText: 'Cancel',
        });
        return false;
      }
      column.data_type = editingValue;
      return true;
    },
    [customTypeMappings, editingValue, promptModal],
  );
  const handleCellSave = useCallback(
    (tableIndex, columnIndex, field) => {
      if (!editingCell) {
        return;
      }
      const updatedSchemaInfo = [...schemaInfo];
      const column = updatedSchemaInfo[tableIndex].columnsInfo[columnIndex];
      let isValidUpdate = true;
      const isColumnNameField = field === 'column_name';
      const isDataTypeField = field === 'data_type';
      const isNullableField = field === 'is_nullable';
      const isDefaultField = field === 'column_default';
      const isPrimaryKeyField = field === 'primary_key';
      const isUniqueField = field === 'unique';
      if (isColumnNameField) {
        isValidUpdate = validateAndSaveColumnName(
          column,
          tableIndex,
          columnIndex,
        );
      }
      if (isDataTypeField) {
        isValidUpdate = validateAndSaveDataType(column);
      }
      if (isNullableField) {
        column.is_nullable = editingValue;
      }
      if (isDefaultField) {
        column.column_default = editingValue || null;
      }
      if (isPrimaryKeyField) {
        column.primary_key = editingValue === 'true' ? true : undefined;
      }
      if (isUniqueField) {
        column.unique = editingValue === 'true' ? true : undefined;
      }
      if (!isValidUpdate) {
        return;
      }
      setSchemaInfo(updatedSchemaInfo);
      setEditingCell(null);
      setEditingValue('');
    },
    [
      editingCell,
      editingValue,
      schemaInfo,
      setSchemaInfo,
      validateAndSaveColumnName,
      validateAndSaveDataType,
    ],
  );
  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);
  const InlineEditControls = ({ originalIndex, field }) => {
    return _jsxs('div', {
      className: 'mt-2 flex gap-2',
      children: [
        _jsx('button', {
          onClick: () => {
            if (selectedTableIndex !== null) {
              handleCellSave(selectedTableIndex, originalIndex, field);
            }
          },
          className:
            'flex items-center justify-center w-8 h-8 bg-green-600 hover:bg-green-500 text-white rounded transition-colors duration-200',
          title: 'Save changes',
          children: '\u2713',
        }),
        _jsx('button', {
          onClick: handleCellCancel,
          className:
            'flex items-center justify-center w-8 h-8 bg-red-600 hover:bg-red-500 text-white rounded transition-colors duration-200',
          title: 'Cancel changes',
          children: '\u2715',
        }),
      ],
    });
  };
  const getExistingPrimaryKeyColumn = useCallback(
    (tableIndex, excludeColumnName) => {
      const table = schemaInfo[tableIndex];
      const primaryKeyColumn = table.columnsInfo.find(
        (col) =>
          col.primary_key === true && col.column_name !== excludeColumnName,
      );
      return primaryKeyColumn !== undefined
        ? primaryKeyColumn.column_name
        : null;
    },
    [schemaInfo],
  );
  const canEditPrimaryKey = useCallback(
    (tableIndex, columnName) => {
      const existingPrimaryKey = getExistingPrimaryKeyColumn(
        tableIndex,
        columnName,
      );
      return existingPrimaryKey === null || existingPrimaryKey === undefined;
    },
    [getExistingPrimaryKeyColumn],
  );
  function cleanUpEmptyArrays(table) {
    // Helper function to check if array exists and is not empty
    const hasItems = (array) => {
      return array != null && array.length > 0;
    };
    // Helper type guard to check if table is ISchemaInfo
    function isISchemaInfo(t) {
      return 'columnsInfo' in t;
    }
    // Start with a clean ISchemaInfo object if the table has columnsInfo
    if (isISchemaInfo(table)) {
      const schemaTable = table;
      const cleaned = {
        tableName: schemaTable.tableName,
        columnsInfo: [...schemaTable.columnsInfo],
      };
      // Only add non-empty arrays
      if (hasItems(schemaTable.hasOne)) {
        cleaned.hasOne = [...schemaTable.hasOne];
      }
      if (hasItems(schemaTable.hasMany)) {
        cleaned.hasMany = [...schemaTable.hasMany];
      }
      if (hasItems(schemaTable.belongsTo)) {
        cleaned.belongsTo = [...schemaTable.belongsTo];
      }
      if (hasItems(schemaTable.belongsToMany)) {
        cleaned.belongsToMany = [...schemaTable.belongsToMany];
      }
      if (hasItems(schemaTable.foreignTables)) {
        cleaned.foreignTables = [...schemaTable.foreignTables];
      }
      if (hasItems(schemaTable.childTables)) {
        cleaned.childTables = [...schemaTable.childTables];
      }
      if (hasItems(schemaTable.requiredColumns)) {
        cleaned.requiredColumns = [...schemaTable.requiredColumns];
      }
      if (hasItems(schemaTable.foreignKeys)) {
        cleaned.foreignKeys = [...schemaTable.foreignKeys];
      }
      if (hasItems(schemaTable.pivotRelationships)) {
        cleaned.pivotRelationships = [...schemaTable.pivotRelationships];
      }
      // Copy other optional properties
      if (schemaTable.isPivot !== undefined) {
        cleaned.isPivot = schemaTable.isPivot;
      }
      if (schemaTable.data !== undefined && schemaTable.data.length > 0) {
        cleaned.data = [...schemaTable.data];
      }
      return cleaned;
    }
    // Fallback for plain ITableInfo
    const cleaned = {
      tableName: table.tableName,
    };
    if (hasItems(table.hasOne)) {
      cleaned.hasOne = [...table.hasOne];
    }
    if (hasItems(table.hasMany)) {
      cleaned.hasMany = [...table.hasMany];
    }
    if (hasItems(table.belongsTo)) {
      cleaned.belongsTo = [...table.belongsTo];
    }
    if (hasItems(table.belongsToMany)) {
      cleaned.belongsToMany = [...table.belongsToMany];
    }
    if (hasItems(table.foreignTables)) {
      cleaned.foreignTables = [...table.foreignTables];
    }
    if (hasItems(table.childTables)) {
      cleaned.childTables = [...table.childTables];
    }
    if (hasItems(table.pivotRelationships)) {
      cleaned.pivotRelationships = [...table.pivotRelationships];
    }
    if (table.isPivot !== undefined) {
      cleaned.isPivot = table.isPivot;
    }
    return cleaned;
  }
  const handleRemoveColumn = async (tableIndex, columnIndex) => {
    const table = schemaInfo[tableIndex];
    const column = table.columnsInfo[columnIndex];
    if (column.primary_key === true) {
      return;
    }
    const result = await promptModal({
      title: `Remove "${column.column_name}" column?`,
      description: `Are you sure you want to remove the "${column.column_name}" column from the "${table.tableName}" table?`,
      confirmButtonText: 'Yes',
      denyButtonText: 'No',
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
    // Remove column from requiredColumns
    if (updatedTable.requiredColumns) {
      updatedTable.requiredColumns = updatedTable.requiredColumns.filter(
        (colName) => colName !== column.column_name,
      );
    }
    // Remove column from foreignKeys if it was a foreign key
    if (updatedTable.foreignKeys) {
      updatedTable.foreignKeys = updatedTable.foreignKeys.filter(
        (colName) => colName !== column.column_name,
      );
    }
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
        // Clean up parent table
        updatedSchema[parentTableIndex] = cleanUpEmptyArrays(parentTable);
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
    // Clean up current table
    updatedSchema[tableIndex] = cleanUpEmptyArrays(updatedTable);
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
  return _jsxs('div', {
    className: 'text-white',
    children: [
      schemaInfo.length > 0 &&
        _jsx('button', {
          className:
            'float-right sm:mb-2 px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50',
          onClick: () => {
            void (async () => {
              const result = await promptModal({
                title: 'Delete All Tables',
                description:
                  'Are you sure you want to delete all tables? This action cannot be undone.',
                confirmButtonText: 'Yes',
                denyButtonText: 'No',
              });
              if (result) {
                setSchemaInfo([]); // Clear all tables
              }
            })();
          },
          children: 'Delete Tables',
        }),
      _jsx(TableAdder, {}),
      schemaInfo.length === 0
        ? /* Empty State */
          _jsx('div', {
            className:
              'flex flex-col items-center justify-center min-h-[400px] text-center',
            children: _jsxs('div', {
              className:
                'bg-gray-800/50 rounded-lg p-8 max-w-md mx-auto border border-gray-700',
              children: [
                _jsx('div', {
                  className:
                    'w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center',
                  children: _jsx('svg', {
                    className: 'w-8 h-8 text-gray-400',
                    fill: 'none',
                    stroke: 'currentColor',
                    viewBox: '0 0 24 24',
                    children: _jsx('path', {
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      strokeWidth: 2,
                      d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
                    }),
                  }),
                }),
                _jsx('h3', {
                  className: 'text-xl font-semibold text-white mb-2',
                  children: 'No Tables Created',
                }),
                _jsx('p', {
                  className: 'text-gray-400 mb-6 leading-relaxed',
                  children:
                    "Get started by creating your first database table. Define your schema structure and relationships to build your application's data model.",
                }),
                _jsxs('div', {
                  className: 'space-y-3 text-sm text-gray-300',
                  children: [
                    _jsxs('div', {
                      className: 'flex items-center justify-start text-left',
                      children: [
                        _jsx('div', {
                          className:
                            'w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0',
                          children: _jsx('span', {
                            className: 'text-blue-400 text-xs font-bold',
                            children: '1',
                          }),
                        }),
                        _jsx('span', {
                          children: 'Enter a table name in the field above',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex items-center justify-start text-left',
                      children: [
                        _jsx('div', {
                          className:
                            'w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0',
                          children: _jsx('span', {
                            className: 'text-green-400 text-xs font-bold',
                            children: '2',
                          }),
                        }),
                        _jsx('span', {
                          children:
                            'Click "Add Table" to create your first table',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex items-center justify-start text-left',
                      children: [
                        _jsx('div', {
                          className:
                            'w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0',
                          children: _jsx('span', {
                            className: 'text-purple-400 text-xs font-bold',
                            children: '3',
                          }),
                        }),
                        _jsx('span', {
                          children: 'Add columns and define relationships',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          })
        : /* Tables List */
          _jsxs('div', {
            className: 'flex flex-col md:flex-row',
            children: [
              _jsxs('div', {
                className:
                  'pr-6 w-full md:w-80 flex-shrink-0 max-h-screen overflow-y-auto',
                children: [
                  _jsx('div', {
                    className: 'mb-4',
                    children: _jsxs('div', {
                      className: 'relative',
                      children: [
                        _jsx('svg', {
                          className:
                            'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400',
                          fill: 'none',
                          stroke: 'currentColor',
                          viewBox: '0 0 24 24',
                          children: _jsx('path', {
                            strokeLinecap: 'round',
                            strokeLinejoin: 'round',
                            strokeWidth: 2,
                            d: 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z',
                          }),
                        }),
                        _jsx('input', {
                          type: 'text',
                          placeholder: 'Search tables...',
                          value: searchTerm,
                          onChange: (e) => {
                            setSearchTerm(e.target.value);
                          },
                          className:
                            'w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                        }),
                      ],
                    }),
                  }),
                  _jsxs('div', {
                    className:
                      'bg-gray-800/50 rounded-lg border border-gray-700 p-4',
                    children: [
                      _jsxs('div', {
                        className: 'flex items-center mb-4',
                        children: [
                          _jsx('svg', {
                            className: 'w-5 h-5 text-blue-400 mr-2',
                            fill: 'none',
                            stroke: 'currentColor',
                            viewBox: '0 0 24 24',
                            children: _jsx('path', {
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round',
                              strokeWidth: 2,
                              d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
                            }),
                          }),
                          _jsx('h2', {
                            className: 'text-lg font-semibold text-white',
                            children: 'Main Tables',
                          }),
                          _jsx('span', {
                            className:
                              'ml-auto bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full',
                            children: mainTables.length,
                          }),
                        ],
                      }),
                      _jsx('div', {
                        className:
                          'space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2',
                        children: mainTables
                          .filter((table) =>
                            table.tableName
                              .toLowerCase()
                              .includes(debouncedSearchTerm.toLowerCase()),
                          )
                          .map((tableInfo) => {
                            const { tableName } = tableInfo;
                            const tableIndex = schemaInfo.findIndex(
                              ({ tableName: currentTable }) =>
                                currentTable === tableName,
                            );
                            const isSelected =
                              selectedTableIndex === tableIndex;
                            return _jsx(
                              'div',
                              {
                                role: 'button',
                                onKeyDown: () => {
                                  return;
                                },
                                tabIndex: -1,
                                className: `p-3 rounded-md cursor-pointer transition-all duration-200 group ${
                                  isSelected
                                    ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                                    : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                                }`,
                                onClick: () => {
                                  setSelectedTableIndex(tableIndex);
                                },
                                children: _jsxs('div', {
                                  className: 'flex items-center',
                                  children: [
                                    _jsxs('svg', {
                                      className: `w-4 h-4 mr-2 ${isSelected ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`,
                                      fill: 'none',
                                      stroke: 'currentColor',
                                      viewBox: '0 0 24 24',
                                      children: [
                                        _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
                                        }),
                                        _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M8 5a2 2 0 012-2h2a2 2 0 012 2v0H8v0z',
                                        }),
                                      ],
                                    }),
                                    _jsx('span', {
                                      className: 'font-medium',
                                      children: tableName,
                                    }),
                                    isSelected &&
                                      _jsx('svg', {
                                        className:
                                          'w-3 h-3 ml-auto text-indigo-400',
                                        fill: 'currentColor',
                                        viewBox: '0 0 20 20',
                                        children: _jsx('path', {
                                          fillRule: 'evenodd',
                                          d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                                          clipRule: 'evenodd',
                                        }),
                                      }),
                                  ],
                                }),
                              },
                              tableName,
                            );
                          }),
                      }),
                    ],
                  }),
                  standaloneTables.length > 0 &&
                    _jsxs('div', {
                      className:
                        'bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4',
                      children: [
                        _jsxs('div', {
                          className: 'flex items-center mb-4',
                          children: [
                            _jsx('svg', {
                              className: 'w-5 h-5 text-yellow-400 mr-2',
                              fill: 'none',
                              stroke: 'currentColor',
                              viewBox: '0 0 24 24',
                              children: _jsx('path', {
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                strokeWidth: 2,
                                d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                              }),
                            }),
                            _jsx('h2', {
                              className: 'text-lg font-semibold text-white',
                              children: 'Standalone Tables',
                            }),
                            _jsx('span', {
                              className:
                                'ml-auto bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full',
                              children: standaloneTables.length,
                            }),
                          ],
                        }),
                        _jsx('div', {
                          className:
                            'space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2',
                          children: standaloneTables
                            .filter((table) =>
                              table.tableName
                                .toLowerCase()
                                .includes(debouncedSearchTerm.toLowerCase()),
                            )
                            .map((tableInfo) => {
                              const { tableName } = tableInfo;
                              const tableIndex = schemaInfo.findIndex(
                                ({ tableName: currentTable }) =>
                                  currentTable === tableName,
                              );
                              const isSelected =
                                selectedTableIndex === tableIndex;
                              return _jsx(
                                'div',
                                {
                                  role: 'button',
                                  onKeyDown: () => {
                                    return;
                                  },
                                  tabIndex: -1,
                                  className: `p-3 rounded-md cursor-pointer transition-all duration-200 group ${
                                    isSelected
                                      ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-300'
                                      : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                                  }`,
                                  onClick: () => {
                                    setSelectedTableIndex(tableIndex);
                                  },
                                  children: _jsxs('div', {
                                    className: 'flex items-center',
                                    children: [
                                      _jsx('svg', {
                                        className: `w-4 h-4 mr-2 ${isSelected ? 'text-yellow-400' : 'text-gray-500 group-hover:text-gray-400'}`,
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        viewBox: '0 0 24 24',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                        }),
                                      }),
                                      _jsx('span', {
                                        className: 'font-medium',
                                        children: tableName,
                                      }),
                                      isSelected &&
                                        _jsx('svg', {
                                          className:
                                            'w-3 h-3 ml-auto text-yellow-400',
                                          fill: 'currentColor',
                                          viewBox: '0 0 20 20',
                                          children: _jsx('path', {
                                            fillRule: 'evenodd',
                                            d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                                            clipRule: 'evenodd',
                                          }),
                                        }),
                                    ],
                                  }),
                                },
                                tableName,
                              );
                            }),
                        }),
                      ],
                    }),
                  pivotTables.length > 0 &&
                    _jsxs('div', {
                      className:
                        'bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4',
                      children: [
                        _jsxs('div', {
                          className: 'flex items-center mb-4',
                          children: [
                            _jsx('svg', {
                              className: 'w-5 h-5 text-purple-400 mr-2',
                              fill: 'none',
                              stroke: 'currentColor',
                              viewBox: '0 0 24 24',
                              children: _jsx('path', {
                                strokeLinecap: 'round',
                                strokeLinejoin: 'round',
                                strokeWidth: 2,
                                d: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
                              }),
                            }),
                            _jsx('h2', {
                              className: 'text-lg font-semibold text-white',
                              children: 'Pivot Tables',
                            }),
                            _jsx('span', {
                              className:
                                'ml-auto bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full',
                              children: pivotTables.length,
                            }),
                          ],
                        }),
                        _jsx('div', {
                          className:
                            'space-y-1 max-h-64 overflow-y-auto pr-2 -mr-2',
                          children: schemaInfo
                            .filter((table) => table.isPivot === true)
                            .filter((table) =>
                              table.tableName
                                .toLowerCase()
                                .includes(debouncedSearchTerm.toLowerCase()),
                            )
                            .map((tableInfo) => {
                              const { tableName } = tableInfo;
                              const tableIndex = schemaInfo.findIndex(
                                ({ tableName: currentTable }) =>
                                  currentTable === tableName,
                              );
                              const isSelected =
                                selectedTableIndex === tableIndex;
                              return _jsx(
                                'div',
                                {
                                  role: 'button',
                                  onKeyDown: () => {
                                    return;
                                  },
                                  tabIndex: -1,
                                  className: `p-3 rounded-md cursor-pointer transition-all duration-200 group ${
                                    isSelected
                                      ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                                      : 'hover:bg-gray-700/50 text-gray-300 hover:text-white border border-transparent'
                                  }`,
                                  onClick: () => {
                                    setSelectedTableIndex(tableIndex);
                                  },
                                  children: _jsxs('div', {
                                    className: 'flex items-center',
                                    children: [
                                      _jsx('svg', {
                                        className: `w-4 h-4 mr-2 ${isSelected ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-400'}`,
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        viewBox: '0 0 24 24',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
                                        }),
                                      }),
                                      _jsx('span', {
                                        className: 'font-medium',
                                        children: tableName,
                                      }),
                                      isSelected &&
                                        _jsx('svg', {
                                          className:
                                            'w-3 h-3 ml-auto text-purple-400',
                                          fill: 'currentColor',
                                          viewBox: '0 0 20 20',
                                          children: _jsx('path', {
                                            fillRule: 'evenodd',
                                            d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
                                            clipRule: 'evenodd',
                                          }),
                                        }),
                                    ],
                                  }),
                                },
                                tableName,
                              );
                            }),
                        }),
                      ],
                    }),
                ],
              }),
              _jsx('div', {
                className: 'flex-1 p-4 min-w-0',
                children:
                  selectedTableIndex !== null &&
                  Boolean(schemaInfo[selectedTableIndex]) &&
                  _jsxs(
                    'div',
                    {
                      children: [
                        _jsx('div', {
                          className: 'flex items-center justify-between mb-4',
                          children: _jsxs('h2', {
                            className: 'text-xl font-semibold',
                            children: [
                              schemaInfo[selectedTableIndex].tableName,
                              schemaInfo[selectedTableIndex].isPivot !== true &&
                                _jsxs(_Fragment, {
                                  children: [
                                    '\u00A0',
                                    _jsx(EditIcon, {
                                      onClick: () => {
                                        void (async () => {
                                          await handleRenameTable(
                                            selectedTableIndex,
                                          );
                                        })();
                                      },
                                      fontSize: 'small',
                                      className: `text-white-500 cursor-pointer`,
                                    }),
                                    '\u00A0',
                                    _jsx(CloseIcon, {
                                      onClick: () => {
                                        void (async () => {
                                          await handleRemoveRelationship(
                                            selectedTableIndex,
                                          );
                                        })();
                                      },
                                      fontSize: 'medium',
                                      className: `text-white-500 cursor-pointer`,
                                    }),
                                  ],
                                }),
                            ],
                          }),
                        }),
                        schemaInfo[selectedTableIndex].isPivot !== true &&
                          _jsxs(_Fragment, {
                            children: [
                              _jsxs('div', {
                                className: 'flex flex-wrap gap-2 mt-4',
                                children: [
                                  _jsx('button', {
                                    onClick: () => {
                                      void (async () => {
                                        await handleAddRelationship(
                                          selectedTableIndex,
                                          'hasOne',
                                        );
                                      })();
                                    },
                                    className:
                                      'px-3 py-1 bg-blue-500 text-black font-bold rounded',
                                    children: 'Add One-to-One',
                                  }),
                                  _jsx('button', {
                                    onClick: () => {
                                      void (async () => {
                                        await handleAddRelationship(
                                          selectedTableIndex,
                                          'hasMany',
                                        );
                                      })();
                                    },
                                    className:
                                      'px-3 py-1 bg-green-500 text-black font-bold rounded',
                                    children: 'Add One-to-Many',
                                  }),
                                  _jsx('button', {
                                    onClick: () => {
                                      void (async () => {
                                        await handleAddRelationship(
                                          selectedTableIndex,
                                          'belongsToMany',
                                        );
                                      })();
                                    },
                                    className:
                                      'px-3 py-1 bg-purple-500 text-black font-bold rounded',
                                    children: 'Add Many-to-Many',
                                  }),
                                ],
                              }),
                              _jsx('br', {}),
                            ],
                          }),
                        _jsx('h3', {
                          className: 'font-semibold mt-4 mb-2',
                          children: 'Relationships',
                        }),
                        _jsxs('div', {
                          className: 'space-y-4',
                          children: [
                            (Boolean(
                              schemaInfo[selectedTableIndex].hasOne &&
                                schemaInfo[selectedTableIndex].hasOne.length >
                                  0,
                            ) ||
                              Boolean(
                                schemaInfo[selectedTableIndex].belongsTo?.some(
                                  (table) => {
                                    const parentTable = schemaInfo.find(
                                      (t) => t.tableName === table,
                                    );
                                    return (
                                      parentTable?.hasOne?.includes(
                                        schemaInfo[selectedTableIndex]
                                          .tableName,
                                      ) ?? false
                                    );
                                  },
                                ),
                              )) &&
                              _jsxs('div', {
                                className: 'bg-blue-500/10 p-4 rounded-lg',
                                children: [
                                  _jsx('h4', {
                                    className:
                                      'font-semibold text-blue-400 mb-2',
                                    children: 'One-to-One Relationships',
                                  }),
                                  _jsxs('ul', {
                                    className: 'space-y-2',
                                    children: [
                                      schemaInfo[
                                        selectedTableIndex
                                      ].hasOne?.map((table) =>
                                        _jsxs(
                                          'li',
                                          {
                                            className: 'flex items-center',
                                            children: [
                                              _jsx('span', {
                                                className: 'text-blue-300',
                                                children: 'Has One:',
                                              }),
                                              _jsx('button', {
                                                onClick: () => {
                                                  const tableIndex =
                                                    schemaInfo.findIndex(
                                                      (t) =>
                                                        t.tableName === table,
                                                    );
                                                  if (tableIndex !== -1) {
                                                    setSelectedTableIndex(
                                                      tableIndex,
                                                    );
                                                  }
                                                },
                                                className:
                                                  'ml-2 font-medium text-blue-200 hover:text-blue-100 hover:underline cursor-pointer transition-colors duration-200',
                                                children: table,
                                              }),
                                            ],
                                          },
                                          table,
                                        ),
                                      ),
                                      schemaInfo[selectedTableIndex].belongsTo
                                        ?.filter((table) => {
                                          const parentTable = schemaInfo.find(
                                            (t) => t.tableName === table,
                                          );
                                          return (
                                            parentTable?.hasOne?.includes(
                                              schemaInfo[selectedTableIndex]
                                                .tableName,
                                            ) ?? false
                                          );
                                        })
                                        .map((table) =>
                                          _jsxs(
                                            'li',
                                            {
                                              className: 'flex items-center',
                                              children: [
                                                _jsx('span', {
                                                  className: 'text-blue-300',
                                                  children: 'Belongs To:',
                                                }),
                                                _jsx('button', {
                                                  onClick: () => {
                                                    const tableIndex =
                                                      schemaInfo.findIndex(
                                                        (t) =>
                                                          t.tableName === table,
                                                      );
                                                    if (tableIndex !== -1) {
                                                      setSelectedTableIndex(
                                                        tableIndex,
                                                      );
                                                    }
                                                  },
                                                  className:
                                                    'ml-2 font-medium text-blue-200 hover:text-blue-100 hover:underline cursor-pointer transition-colors duration-200',
                                                  children: table,
                                                }),
                                              ],
                                            },
                                            table,
                                          ),
                                        ),
                                    ],
                                  }),
                                ],
                              }),
                            (Boolean(
                              schemaInfo[selectedTableIndex].hasMany &&
                                schemaInfo[selectedTableIndex].hasMany.length >
                                  0,
                            ) ||
                              Boolean(
                                schemaInfo[selectedTableIndex].belongsTo?.some(
                                  (table) => {
                                    const parentTable = schemaInfo.find(
                                      (t) => t.tableName === table,
                                    );
                                    return (
                                      parentTable?.hasMany?.includes(
                                        schemaInfo[selectedTableIndex]
                                          .tableName,
                                      ) ?? false
                                    );
                                  },
                                ),
                              )) &&
                              _jsxs('div', {
                                className: 'bg-green-500/10 p-4 rounded-lg',
                                children: [
                                  _jsx('h4', {
                                    className:
                                      'font-semibold text-green-400 mb-2',
                                    children: 'One-to-Many Relationships',
                                  }),
                                  _jsxs('ul', {
                                    className: 'space-y-2',
                                    children: [
                                      schemaInfo[
                                        selectedTableIndex
                                      ].hasMany?.map((table) =>
                                        _jsxs(
                                          'li',
                                          {
                                            className: 'flex items-center',
                                            children: [
                                              _jsx('span', {
                                                className: 'text-green-300',
                                                children: 'Has Many:',
                                              }),
                                              _jsx('button', {
                                                onClick: () => {
                                                  const tableIndex =
                                                    schemaInfo.findIndex(
                                                      (t) =>
                                                        t.tableName === table,
                                                    );
                                                  if (tableIndex !== -1) {
                                                    setSelectedTableIndex(
                                                      tableIndex,
                                                    );
                                                  }
                                                },
                                                className:
                                                  'ml-2 font-medium text-green-200 hover:text-green-100 hover:underline cursor-pointer transition-colors duration-200',
                                                children: table,
                                              }),
                                            ],
                                          },
                                          table,
                                        ),
                                      ),
                                      schemaInfo[selectedTableIndex].belongsTo
                                        ?.filter((table) => {
                                          const parentTable = schemaInfo.find(
                                            (t) => t.tableName === table,
                                          );
                                          return (
                                            parentTable?.hasMany?.includes(
                                              schemaInfo[selectedTableIndex]
                                                .tableName,
                                            ) ?? false
                                          );
                                        })
                                        .map((table) =>
                                          _jsxs(
                                            'li',
                                            {
                                              className: 'flex items-center',
                                              children: [
                                                _jsx('span', {
                                                  className: 'text-green-300',
                                                  children: 'Belongs To:',
                                                }),
                                                _jsx('button', {
                                                  onClick: () => {
                                                    const tableIndex =
                                                      schemaInfo.findIndex(
                                                        (t) =>
                                                          t.tableName === table,
                                                      );
                                                    if (tableIndex !== -1) {
                                                      setSelectedTableIndex(
                                                        tableIndex,
                                                      );
                                                    }
                                                  },
                                                  className:
                                                    'ml-2 font-medium text-green-200 hover:text-green-100 hover:underline cursor-pointer transition-colors duration-200',
                                                  children: table,
                                                }),
                                              ],
                                            },
                                            table,
                                          ),
                                        ),
                                    ],
                                  }),
                                ],
                              }),
                            schemaInfo[selectedTableIndex].belongsToMany &&
                              schemaInfo[selectedTableIndex].belongsToMany
                                .length > 0 &&
                              schemaInfo[selectedTableIndex]
                                .pivotRelationships &&
                              schemaInfo[selectedTableIndex].pivotRelationships
                                .length > 0 &&
                              _jsxs('div', {
                                className: 'bg-purple-500/10 p-4 rounded-lg',
                                children: [
                                  _jsx('h4', {
                                    className:
                                      'font-semibold text-purple-400 mb-2',
                                    children: 'Many-to-Many Relationships',
                                  }),
                                  _jsxs('ul', {
                                    className: 'space-y-2',
                                    children: [
                                      schemaInfo[
                                        selectedTableIndex
                                      ].belongsToMany.map((table) =>
                                        _jsxs(
                                          'li',
                                          {
                                            className: 'flex items-center',
                                            children: [
                                              _jsx('span', {
                                                className: 'text-purple-300',
                                                children: 'Belongs To Many:',
                                              }),
                                              _jsx('button', {
                                                onClick: () => {
                                                  const tableIndex =
                                                    schemaInfo.findIndex(
                                                      (t) =>
                                                        t.tableName === table,
                                                    );
                                                  if (tableIndex !== -1) {
                                                    setSelectedTableIndex(
                                                      tableIndex,
                                                    );
                                                  }
                                                },
                                                className:
                                                  'ml-2 font-medium text-purple-200 hover:text-purple-100 hover:underline cursor-pointer transition-colors duration-200',
                                                children: table,
                                              }),
                                            ],
                                          },
                                          table,
                                        ),
                                      ),
                                      schemaInfo[
                                        selectedTableIndex
                                      ].pivotRelationships.map((rel, idx) =>
                                        _jsxs(
                                          'li',
                                          {
                                            className: 'flex items-center',
                                            children: [
                                              _jsx('span', {
                                                className: 'text-purple-300',
                                                children: 'Through Pivot:',
                                              }),
                                              _jsxs('span', {
                                                className: 'ml-2 font-medium',
                                                children: [
                                                  _jsx('button', {
                                                    onClick: () => {
                                                      const tableIndex =
                                                        schemaInfo.findIndex(
                                                          (t) =>
                                                            t.tableName ===
                                                            rel.relatedTable,
                                                        );
                                                      if (tableIndex !== -1) {
                                                        setSelectedTableIndex(
                                                          tableIndex,
                                                        );
                                                      }
                                                    },
                                                    className:
                                                      'text-purple-200 hover:text-purple-100 hover:underline cursor-pointer transition-colors duration-200',
                                                    children: rel.relatedTable,
                                                  }),
                                                  _jsx('span', {
                                                    className:
                                                      'text-purple-300 mx-2',
                                                    children: 'via',
                                                  }),
                                                  _jsx('button', {
                                                    onClick: () => {
                                                      const tableIndex =
                                                        schemaInfo.findIndex(
                                                          (t) =>
                                                            t.tableName ===
                                                            rel.pivotTable,
                                                        );
                                                      if (tableIndex !== -1) {
                                                        setSelectedTableIndex(
                                                          tableIndex,
                                                        );
                                                      }
                                                    },
                                                    className:
                                                      'text-purple-200 hover:text-purple-100 hover:underline cursor-pointer transition-colors duration-200',
                                                    children: rel.pivotTable,
                                                  }),
                                                ],
                                              }),
                                            ],
                                          },
                                          idx,
                                        ),
                                      ),
                                    ],
                                  }),
                                ],
                              }),
                            schemaInfo[selectedTableIndex].foreignTables &&
                              schemaInfo[selectedTableIndex].foreignTables
                                .length > 0 &&
                              schemaInfo[selectedTableIndex].childTables &&
                              schemaInfo[selectedTableIndex].childTables
                                .length > 0 &&
                              _jsxs('div', {
                                className: 'bg-gray-500/10 p-4 rounded-lg',
                                children: [
                                  _jsx('h4', {
                                    className:
                                      'font-semibold text-gray-400 mb-2',
                                    children: 'Table References',
                                  }),
                                  _jsxs('ul', {
                                    className: 'space-y-2',
                                    children: [
                                      schemaInfo[selectedTableIndex]
                                        .foreignTables.length > 0 &&
                                        _jsxs('li', {
                                          className: 'flex items-center',
                                          children: [
                                            _jsx('span', {
                                              className: 'text-gray-300',
                                              children: 'Foreign Tables:',
                                            }),
                                            _jsx('span', {
                                              className: 'ml-2 font-medium',
                                              children: schemaInfo[
                                                selectedTableIndex
                                              ].foreignTables?.map(
                                                (table, index) =>
                                                  _jsxs(
                                                    'span',
                                                    {
                                                      children: [
                                                        _jsx('button', {
                                                          onClick: () => {
                                                            const tableIndex =
                                                              schemaInfo.findIndex(
                                                                (t) =>
                                                                  t.tableName ===
                                                                  table,
                                                              );
                                                            if (
                                                              tableIndex !== -1
                                                            ) {
                                                              setSelectedTableIndex(
                                                                tableIndex,
                                                              );
                                                            }
                                                          },
                                                          className:
                                                            'text-gray-200 hover:text-gray-100 hover:underline cursor-pointer transition-colors duration-200',
                                                          children: table,
                                                        }),
                                                        index <
                                                          (schemaInfo[
                                                            selectedTableIndex
                                                          ].foreignTables
                                                            ?.length ?? 0) -
                                                            1 && ', ',
                                                      ],
                                                    },
                                                    table,
                                                  ),
                                              ),
                                            }),
                                          ],
                                        }),
                                      schemaInfo[selectedTableIndex].childTables
                                        .length > 0 &&
                                        _jsxs('li', {
                                          className: 'flex items-center',
                                          children: [
                                            _jsx('span', {
                                              className: 'text-gray-300',
                                              children: 'Child Tables:',
                                            }),
                                            _jsx('span', {
                                              className: 'ml-2 font-medium',
                                              children: schemaInfo[
                                                selectedTableIndex
                                              ].childTables?.map(
                                                (table, index) =>
                                                  _jsxs(
                                                    'span',
                                                    {
                                                      children: [
                                                        _jsx('button', {
                                                          onClick: () => {
                                                            const tableIndex =
                                                              schemaInfo.findIndex(
                                                                (t) =>
                                                                  t.tableName ===
                                                                  table,
                                                              );
                                                            if (
                                                              tableIndex !== -1
                                                            ) {
                                                              setSelectedTableIndex(
                                                                tableIndex,
                                                              );
                                                            }
                                                          },
                                                          className:
                                                            'text-gray-200 hover:text-gray-100 hover:underline cursor-pointer transition-colors duration-200',
                                                          children: table,
                                                        }),
                                                        index <
                                                          (schemaInfo[
                                                            selectedTableIndex
                                                          ].childTables
                                                            ?.length ?? 0) -
                                                            1 && ', ',
                                                      ],
                                                    },
                                                    table,
                                                  ),
                                              ),
                                            }),
                                          ],
                                        }),
                                    ],
                                  }),
                                ],
                              }),
                          ],
                        }),
                        _jsxs(_Fragment, {
                          children: [
                            _jsx('br', {}),
                            _jsxs('div', {
                              className:
                                'flex items-center justify-between mb-4',
                              children: [
                                _jsxs('h3', {
                                  className: 'font-semibold',
                                  children: [
                                    'Columns (',
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
                                    ).length,
                                    ')',
                                  ],
                                }),
                                _jsx('div', {
                                  className: 'flex-1 max-w-xs ml-4',
                                  children: _jsxs('div', {
                                    className: 'relative',
                                    children: [
                                      _jsx('svg', {
                                        className:
                                          'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400',
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        viewBox: '0 0 24 24',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z',
                                        }),
                                      }),
                                      _jsx('input', {
                                        type: 'text',
                                        placeholder: 'Search columns...',
                                        value: columnSearchTerm,
                                        onChange: (e) => {
                                          setColumnSearchTerm(e.target.value);
                                        },
                                        className:
                                          'w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm',
                                      }),
                                    ],
                                  }),
                                }),
                              ],
                            }),
                            _jsx('div', {
                              className:
                                'bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden',
                              children: _jsx('div', {
                                className:
                                  'overflow-x-auto max-h-96 overflow-y-auto',
                                children: _jsxs('table', {
                                  className: 'w-full text-left border-collapse',
                                  children: [
                                    _jsx('thead', {
                                      className:
                                        'sticky top-0 bg-gray-700/90 backdrop-blur-sm',
                                      children: _jsxs('tr', {
                                        children: [
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1 w-12 text-center',
                                            children: '#',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Column Name',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Data Type',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Nullable',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Default',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Primary',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Unique',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1',
                                            children: 'Foreign Key',
                                          }),
                                          _jsx('th', {
                                            className:
                                              'border border-gray-600 px-2 py-1 w-16 text-center',
                                            children: 'Actions',
                                          }),
                                        ],
                                      }),
                                    }),
                                    _jsx('tbody', {
                                      children: schemaInfo[
                                        selectedTableIndex
                                      ].columnsInfo
                                        .filter(
                                          (column) =>
                                            column.column_name
                                              .toLowerCase()
                                              .includes(
                                                debouncedColumnSearchTerm.toLowerCase(),
                                              ) ||
                                            column.data_type
                                              .toLowerCase()
                                              .includes(
                                                debouncedColumnSearchTerm.toLowerCase(),
                                              ),
                                        )
                                        .map((column, filteredIndex) => {
                                          const originalIndex = schemaInfo[
                                            selectedTableIndex
                                          ].columnsInfo.findIndex(
                                            (col) =>
                                              col.column_name ===
                                              column.column_name,
                                          );
                                          return _jsxs(
                                            'tr',
                                            {
                                              children: [
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 text-center',
                                                  children: _jsxs('div', {
                                                    className:
                                                      'flex items-center justify-center space-x-1',
                                                    children: [
                                                      column.primary_key &&
                                                        _jsx('span', {
                                                          className:
                                                            'text-yellow-400 text-sm',
                                                          title: 'Primary Key',
                                                          children:
                                                            '\uD83D\uDD11',
                                                        }),
                                                      column.unique &&
                                                        !column.primary_key &&
                                                        _jsx('span', {
                                                          className:
                                                            'text-blue-400 text-sm',
                                                          title: 'Unique',
                                                          children: '\u2B50',
                                                        }),
                                                      column.foreign_key &&
                                                        _jsx('span', {
                                                          className:
                                                            'text-green-400 text-sm',
                                                          title: `Foreign Key: ${column.foreign_key.foreign_table_name}.${column.foreign_key.foreign_column_name}`,
                                                          children:
                                                            '\uD83D\uDD17',
                                                        }),
                                                      column.is_nullable ===
                                                        'NO' &&
                                                        !column.primary_key &&
                                                        _jsx('span', {
                                                          className:
                                                            'text-red-400 text-xs',
                                                          title: 'Not Nullable',
                                                          children: '!',
                                                        }),
                                                    ],
                                                  }),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 relative',
                                                  children:
                                                    editingCell?.rowIndex ===
                                                      filteredIndex &&
                                                    editingCell?.field ===
                                                      'column_name'
                                                      ? _jsxs('div', {
                                                          className: 'relative',
                                                          children: [
                                                            _jsx('input', {
                                                              type: 'text',
                                                              value:
                                                                editingValue,
                                                              onChange: (e) => {
                                                                setEditingValue(
                                                                  e.target
                                                                    .value,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  'Enter'
                                                                ) {
                                                                  handleCellSave(
                                                                    selectedTableIndex,
                                                                    originalIndex,
                                                                    'column_name',
                                                                  );
                                                                } else if (
                                                                  e.key ===
                                                                  'Escape'
                                                                ) {
                                                                  handleCellCancel();
                                                                }
                                                              },
                                                              onFocus: (e) => {
                                                                const end =
                                                                  e
                                                                    .currentTarget
                                                                    .value
                                                                    .length;
                                                                e.currentTarget.setSelectionRange(
                                                                  end,
                                                                  end,
                                                                );
                                                              },
                                                              className:
                                                                'w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                                                            }),
                                                            _jsx(
                                                              InlineEditControls,
                                                              {
                                                                originalIndex:
                                                                  originalIndex,
                                                                field:
                                                                  'column_name',
                                                              },
                                                            ),
                                                          ],
                                                        })
                                                      : _jsx('button', {
                                                          type: 'button',
                                                          className:
                                                            'cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 w-full text-left',
                                                          onDoubleClick: (
                                                            e,
                                                          ) => {
                                                            handleCellEdit(
                                                              filteredIndex,
                                                              'column_name',
                                                              column.column_name,
                                                              e,
                                                              originalIndex,
                                                            );
                                                          },
                                                          onKeyDown: (e) => {
                                                            if (
                                                              e.key ===
                                                                'Enter' ||
                                                              e.key === ' '
                                                            ) {
                                                              handleCellEdit(
                                                                filteredIndex,
                                                                'column_name',
                                                                column.column_name,
                                                                e,
                                                                originalIndex,
                                                              );
                                                            }
                                                          },
                                                          children:
                                                            column.column_name,
                                                        }),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 relative',
                                                  children:
                                                    editingCell?.rowIndex ===
                                                      filteredIndex &&
                                                    editingCell?.field ===
                                                      'data_type'
                                                      ? _jsxs('div', {
                                                          className: 'relative',
                                                          children: [
                                                            _jsx(
                                                              DataTypeSelector,
                                                              {
                                                                value:
                                                                  editingValue,
                                                                onChange: (
                                                                  e,
                                                                ) => {
                                                                  setEditingValue(
                                                                    e.target
                                                                      .value,
                                                                  );
                                                                },
                                                                onKeyDown: (
                                                                  e,
                                                                ) => {
                                                                  if (
                                                                    e.key ===
                                                                    'Enter'
                                                                  ) {
                                                                    handleCellSave(
                                                                      selectedTableIndex,
                                                                      originalIndex,
                                                                      'data_type',
                                                                    );
                                                                  } else if (
                                                                    e.key ===
                                                                    'Escape'
                                                                  ) {
                                                                    handleCellCancel();
                                                                  }
                                                                },
                                                                id: `data-type-editor-${String(originalIndex)}`,
                                                                className:
                                                                  'w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                                                              },
                                                            ),
                                                            _jsx(
                                                              InlineEditControls,
                                                              {
                                                                originalIndex:
                                                                  originalIndex,
                                                                field:
                                                                  'data_type',
                                                              },
                                                            ),
                                                          ],
                                                        })
                                                      : _jsx('button', {
                                                          type: 'button',
                                                          className:
                                                            'cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 w-full text-left',
                                                          onDoubleClick: (
                                                            e,
                                                          ) => {
                                                            handleCellEdit(
                                                              filteredIndex,
                                                              'data_type',
                                                              column.data_type,
                                                              e,
                                                              originalIndex,
                                                            );
                                                          },
                                                          onKeyDown: (e) => {
                                                            if (
                                                              e.key ===
                                                                'Enter' ||
                                                              e.key === ' '
                                                            ) {
                                                              handleCellEdit(
                                                                filteredIndex,
                                                                'data_type',
                                                                column.data_type,
                                                                e,
                                                                originalIndex,
                                                              );
                                                            }
                                                          },
                                                          children: _jsxs(
                                                            'div',
                                                            {
                                                              className:
                                                                'flex flex-col',
                                                              children: [
                                                                _jsx('span', {
                                                                  className:
                                                                    'font-medium',
                                                                  children:
                                                                    (() => {
                                                                      let effectiveType =
                                                                        column.data_type;
                                                                      if (
                                                                        column.primary_key ===
                                                                        true
                                                                      ) {
                                                                        effectiveType =
                                                                          'primaryKey';
                                                                      }
                                                                      if (
                                                                        column.foreign_key !==
                                                                        undefined
                                                                      ) {
                                                                        effectiveType =
                                                                          'foreignKey';
                                                                      }
                                                                      return getDatabaseType(
                                                                        effectiveType,
                                                                      );
                                                                    })(),
                                                                }),
                                                                _jsx('span', {
                                                                  className:
                                                                    'text-xs text-gray-400',
                                                                  children:
                                                                    getTypeScriptType(
                                                                      column.data_type,
                                                                    ),
                                                                }),
                                                              ],
                                                            },
                                                          ),
                                                        }),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 relative',
                                                  children:
                                                    editingCell?.rowIndex ===
                                                      filteredIndex &&
                                                    editingCell?.field ===
                                                      'is_nullable'
                                                      ? _jsxs('div', {
                                                          className: 'relative',
                                                          children: [
                                                            _jsxs('select', {
                                                              value:
                                                                editingValue,
                                                              onChange: (e) => {
                                                                setEditingValue(
                                                                  e.target
                                                                    .value,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  'Enter'
                                                                ) {
                                                                  handleCellSave(
                                                                    selectedTableIndex,
                                                                    originalIndex,
                                                                    'is_nullable',
                                                                  );
                                                                } else if (
                                                                  e.key ===
                                                                  'Escape'
                                                                ) {
                                                                  handleCellCancel();
                                                                }
                                                              },
                                                              id: `nullable-editor-${String(originalIndex)}`,
                                                              className:
                                                                'w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                                                              children: [
                                                                _jsx('option', {
                                                                  value: 'YES',
                                                                  children:
                                                                    'YES',
                                                                }),
                                                                _jsx('option', {
                                                                  value: 'NO',
                                                                  children:
                                                                    'NO',
                                                                }),
                                                              ],
                                                            }),
                                                            _jsx(
                                                              InlineEditControls,
                                                              {
                                                                originalIndex:
                                                                  originalIndex,
                                                                field:
                                                                  'is_nullable',
                                                              },
                                                            ),
                                                          ],
                                                        })
                                                      : (() => {
                                                          if (
                                                            column.primary_key ===
                                                            true
                                                          ) {
                                                            return _jsx('div', {
                                                              className:
                                                                'px-1 py-0.5 text-gray-500 cursor-not-allowed rounded',
                                                              title:
                                                                'Primary keys are automatically NOT NULL',
                                                              children: 'NO',
                                                            });
                                                          }
                                                          return _jsx(
                                                            'button',
                                                            {
                                                              type: 'button',
                                                              className:
                                                                'cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 w-full text-left',
                                                              onDoubleClick: (
                                                                e,
                                                              ) => {
                                                                handleCellEdit(
                                                                  filteredIndex,
                                                                  'is_nullable',
                                                                  column.is_nullable,
                                                                  e,
                                                                  originalIndex,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                    'Enter' ||
                                                                  e.key === ' '
                                                                ) {
                                                                  handleCellEdit(
                                                                    filteredIndex,
                                                                    'is_nullable',
                                                                    column.is_nullable,
                                                                    e,
                                                                    originalIndex,
                                                                  );
                                                                }
                                                              },
                                                              children:
                                                                column.is_nullable,
                                                            },
                                                          );
                                                        })(),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 relative',
                                                  children:
                                                    editingCell?.rowIndex ===
                                                      filteredIndex &&
                                                    editingCell?.field ===
                                                      'column_default'
                                                      ? _jsxs('div', {
                                                          className: 'relative',
                                                          children: [
                                                            _jsx('input', {
                                                              type: 'text',
                                                              value:
                                                                editingValue,
                                                              onChange: (e) => {
                                                                setEditingValue(
                                                                  e.target
                                                                    .value,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  'Enter'
                                                                ) {
                                                                  handleCellSave(
                                                                    selectedTableIndex,
                                                                    originalIndex,
                                                                    'column_default',
                                                                  );
                                                                } else if (
                                                                  e.key ===
                                                                  'Escape'
                                                                ) {
                                                                  handleCellCancel();
                                                                }
                                                              },
                                                              onFocus: (e) => {
                                                                const end =
                                                                  e
                                                                    .currentTarget
                                                                    .value
                                                                    .length;
                                                                e.currentTarget.setSelectionRange(
                                                                  end,
                                                                  end,
                                                                );
                                                              },
                                                              className:
                                                                'w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                                                            }),
                                                            _jsx(
                                                              InlineEditControls,
                                                              {
                                                                originalIndex:
                                                                  originalIndex,
                                                                field:
                                                                  'column_default',
                                                              },
                                                            ),
                                                          ],
                                                        })
                                                      : _jsx('button', {
                                                          type: 'button',
                                                          className:
                                                            'cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 w-full text-left',
                                                          onDoubleClick: (
                                                            e,
                                                          ) => {
                                                            handleCellEdit(
                                                              filteredIndex,
                                                              'column_default',
                                                              getColumnDefaultDisplay(
                                                                {
                                                                  isPrimaryKey:
                                                                    column.primary_key ??
                                                                    false,
                                                                  isNullable:
                                                                    column.is_nullable,
                                                                  columnDefault:
                                                                    column.column_default,
                                                                },
                                                              ),
                                                              e,
                                                              originalIndex,
                                                            );
                                                          },
                                                          onKeyDown: (e) => {
                                                            if (
                                                              e.key ===
                                                                'Enter' ||
                                                              e.key === ' '
                                                            ) {
                                                              handleCellEdit(
                                                                filteredIndex,
                                                                'column_default',
                                                                getColumnDefaultDisplay(
                                                                  {
                                                                    isPrimaryKey:
                                                                      column.primary_key ??
                                                                      false,
                                                                    isNullable:
                                                                      column.is_nullable,
                                                                    columnDefault:
                                                                      column.column_default,
                                                                  },
                                                                ),
                                                                e,
                                                                originalIndex,
                                                              );
                                                            }
                                                          },
                                                          children:
                                                            getColumnDefaultDisplay(
                                                              {
                                                                isPrimaryKey:
                                                                  column.primary_key ??
                                                                  false,
                                                                isNullable:
                                                                  column.is_nullable,
                                                                columnDefault:
                                                                  column.column_default,
                                                              },
                                                            ),
                                                        }),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 relative',
                                                  children:
                                                    editingCell?.rowIndex ===
                                                      filteredIndex &&
                                                    editingCell?.field ===
                                                      'primary_key'
                                                      ? _jsxs('div', {
                                                          className: 'relative',
                                                          children: [
                                                            _jsxs('select', {
                                                              value:
                                                                editingValue,
                                                              onChange: (e) => {
                                                                setEditingValue(
                                                                  e.target
                                                                    .value,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  'Enter'
                                                                ) {
                                                                  handleCellSave(
                                                                    selectedTableIndex,
                                                                    originalIndex,
                                                                    'primary_key',
                                                                  );
                                                                } else if (
                                                                  e.key ===
                                                                  'Escape'
                                                                ) {
                                                                  handleCellCancel();
                                                                }
                                                              },
                                                              id: `pk-editor-${String(originalIndex)}`,
                                                              className:
                                                                'w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                                                              children: [
                                                                _jsx('option', {
                                                                  value: 'true',
                                                                  children:
                                                                    'Yes',
                                                                }),
                                                                _jsx('option', {
                                                                  value:
                                                                    'false',
                                                                  children:
                                                                    'No',
                                                                }),
                                                              ],
                                                            }),
                                                            _jsx(
                                                              InlineEditControls,
                                                              {
                                                                originalIndex:
                                                                  originalIndex,
                                                                field:
                                                                  'primary_key',
                                                              },
                                                            ),
                                                          ],
                                                        })
                                                      : (() => {
                                                          const canEdit =
                                                            canEditPrimaryKey(
                                                              selectedTableIndex,
                                                              column.column_name,
                                                            );
                                                          const isCurrentPrimaryKey =
                                                            column.primary_key ===
                                                            true;
                                                          const existingPrimaryKey =
                                                            getExistingPrimaryKeyColumn(
                                                              selectedTableIndex,
                                                              column.column_name,
                                                            );
                                                          if (
                                                            !canEdit &&
                                                            !isCurrentPrimaryKey
                                                          ) {
                                                            return _jsx('div', {
                                                              className:
                                                                'px-1 py-0.5 text-gray-500 cursor-not-allowed rounded',
                                                              title: `Cannot set as primary key. "${String(existingPrimaryKey)}" is already the primary key.`,
                                                              children: 'No',
                                                            });
                                                          }
                                                          return _jsx(
                                                            'button',
                                                            {
                                                              type: 'button',
                                                              className:
                                                                'cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 w-full text-left',
                                                              onDoubleClick: (
                                                                e,
                                                              ) => {
                                                                handleCellEdit(
                                                                  filteredIndex,
                                                                  'primary_key',
                                                                  column.primary_key
                                                                    ? 'true'
                                                                    : 'false',
                                                                  e,
                                                                  originalIndex,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                    'Enter' ||
                                                                  e.key === ' '
                                                                ) {
                                                                  handleCellEdit(
                                                                    filteredIndex,
                                                                    'primary_key',
                                                                    column.primary_key
                                                                      ? 'true'
                                                                      : 'false',
                                                                    e,
                                                                    originalIndex,
                                                                  );
                                                                }
                                                              },
                                                              children:
                                                                column.primary_key
                                                                  ? 'Yes'
                                                                  : 'No',
                                                            },
                                                          );
                                                        })(),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 relative',
                                                  children:
                                                    editingCell?.rowIndex ===
                                                      filteredIndex &&
                                                    editingCell?.field ===
                                                      'unique'
                                                      ? _jsxs('div', {
                                                          className: 'relative',
                                                          children: [
                                                            _jsxs('select', {
                                                              value:
                                                                editingValue,
                                                              onChange: (e) => {
                                                                setEditingValue(
                                                                  e.target
                                                                    .value,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  'Enter'
                                                                ) {
                                                                  handleCellSave(
                                                                    selectedTableIndex,
                                                                    originalIndex,
                                                                    'unique',
                                                                  );
                                                                } else if (
                                                                  e.key ===
                                                                  'Escape'
                                                                ) {
                                                                  handleCellCancel();
                                                                }
                                                              },
                                                              id: `unique-editor-${String(originalIndex)}`,
                                                              className:
                                                                'w-full px-1 py-0.5 bg-gray-700 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500',
                                                              children: [
                                                                _jsx('option', {
                                                                  value: 'true',
                                                                  children:
                                                                    'Yes',
                                                                }),
                                                                _jsx('option', {
                                                                  value:
                                                                    'false',
                                                                  children:
                                                                    'No',
                                                                }),
                                                              ],
                                                            }),
                                                            _jsx(
                                                              InlineEditControls,
                                                              {
                                                                originalIndex:
                                                                  originalIndex,
                                                                field: 'unique',
                                                              },
                                                            ),
                                                          ],
                                                        })
                                                      : (() => {
                                                          if (
                                                            column.primary_key ===
                                                            true
                                                          ) {
                                                            return _jsx('div', {
                                                              className:
                                                                'px-1 py-0.5 text-gray-500 cursor-not-allowed rounded',
                                                              title:
                                                                'Primary keys are automatically UNIQUE',
                                                              children: 'Yes',
                                                            });
                                                          }
                                                          return _jsx(
                                                            'button',
                                                            {
                                                              type: 'button',
                                                              className:
                                                                'cursor-pointer hover:bg-gray-600/50 rounded px-1 py-0.5 w-full text-left',
                                                              onDoubleClick: (
                                                                e,
                                                              ) => {
                                                                handleCellEdit(
                                                                  filteredIndex,
                                                                  'unique',
                                                                  column.unique
                                                                    ? 'true'
                                                                    : 'false',
                                                                  e,
                                                                  originalIndex,
                                                                );
                                                              },
                                                              onKeyDown: (
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                    'Enter' ||
                                                                  e.key === ' '
                                                                ) {
                                                                  handleCellEdit(
                                                                    filteredIndex,
                                                                    'unique',
                                                                    column.unique
                                                                      ? 'true'
                                                                      : 'false',
                                                                    e,
                                                                    originalIndex,
                                                                  );
                                                                }
                                                              },
                                                              children:
                                                                column.unique
                                                                  ? 'Yes'
                                                                  : 'No',
                                                            },
                                                          );
                                                        })(),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1',
                                                  children: _jsx('div', {
                                                    className: 'text-gray-400',
                                                    children: column.foreign_key
                                                      ? `${column.foreign_key.foreign_column_name} (${column.foreign_key.foreign_table_name})`
                                                      : 'None',
                                                  }),
                                                }),
                                                _jsx('td', {
                                                  className:
                                                    'border border-gray-600 px-2 py-1 text-center',
                                                  children:
                                                    column.primary_key === true
                                                      ? _jsx('div', {
                                                          className:
                                                            'text-gray-600 rounded p-1 inline-block',
                                                          title:
                                                            'Primary key columns cannot be removed',
                                                          children: _jsx(
                                                            'svg',
                                                            {
                                                              className:
                                                                'w-4 h-4',
                                                              fill: 'none',
                                                              stroke:
                                                                'currentColor',
                                                              viewBox:
                                                                '0 0 24 24',
                                                              children: _jsx(
                                                                'path',
                                                                {
                                                                  strokeLinecap:
                                                                    'round',
                                                                  strokeLinejoin:
                                                                    'round',
                                                                  strokeWidth: 2,
                                                                  d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
                                                                },
                                                              ),
                                                            },
                                                          ),
                                                        })
                                                      : _jsx('button', {
                                                          onClick: () => {
                                                            void (async () => {
                                                              await handleRemoveColumn(
                                                                selectedTableIndex,
                                                                originalIndex,
                                                              );
                                                            })();
                                                          },
                                                          className:
                                                            'text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded p-1 transition-colors duration-200',
                                                          title: `Remove ${column.column_name} column`,
                                                          children: _jsx(
                                                            'svg',
                                                            {
                                                              className:
                                                                'w-4 h-4',
                                                              fill: 'none',
                                                              stroke:
                                                                'currentColor',
                                                              viewBox:
                                                                '0 0 24 24',
                                                              children: _jsx(
                                                                'path',
                                                                {
                                                                  strokeLinecap:
                                                                    'round',
                                                                  strokeLinejoin:
                                                                    'round',
                                                                  strokeWidth: 2,
                                                                  d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
                                                                },
                                                              ),
                                                            },
                                                          ),
                                                        }),
                                                }),
                                              ],
                                            },
                                            column.column_name,
                                          );
                                        }),
                                    }),
                                  ],
                                }),
                              }),
                            }),
                            false,
                            (schemaInfo[selectedTableIndex].isPivot !== true ||
                              isPivotTableColumnsEditable) &&
                              _jsxs('div', {
                                className:
                                  'bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4',
                                children: [
                                  _jsxs('h4', {
                                    className:
                                      'text-lg font-medium text-white mb-4 flex items-center',
                                    children: [
                                      _jsx('svg', {
                                        className:
                                          'w-5 h-5 mr-2 text-indigo-400',
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        viewBox: '0 0 24 24',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
                                        }),
                                      }),
                                      'Add New Column',
                                    ],
                                  }),
                                  _jsxs('form', {
                                    onSubmit: handleSubmit,
                                    className: 'space-y-4',
                                    children: [
                                      columnValidationError !== null &&
                                        columnValidationError !== undefined &&
                                        _jsxs('div', {
                                          className:
                                            'bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2',
                                          children: [
                                            _jsx('div', {
                                              className: 'flex-1',
                                              children: _jsx('p', {
                                                className:
                                                  'text-sm text-red-200 mt-1',
                                                children: columnValidationError,
                                              }),
                                            }),
                                            _jsx('button', {
                                              type: 'button',
                                              onClick: () => {
                                                setColumnValidationError(null);
                                              },
                                              className:
                                                'text-red-300 hover:text-red-200 transition-colors',
                                              children: _jsx('svg', {
                                                className: 'w-4 h-4',
                                                fill: 'none',
                                                stroke: 'currentColor',
                                                viewBox: '0 0 24 24',
                                                children: _jsx('path', {
                                                  strokeLinecap: 'round',
                                                  strokeLinejoin: 'round',
                                                  strokeWidth: 2,
                                                  d: 'M6 18L18 6M6 6l12 12',
                                                }),
                                              }),
                                            }),
                                          ],
                                        }),
                                      _jsxs('div', {
                                        className: 'space-y-4',
                                        children: [
                                          _jsxs('div', {
                                            className:
                                              'grid grid-cols-1 md:grid-cols-2 gap-4',
                                            children: [
                                              _jsxs('div', {
                                                children: [
                                                  _jsxs('label', {
                                                    htmlFor: 'columnName',
                                                    className:
                                                      'block text-sm font-medium text-gray-300 mb-1',
                                                    children: [
                                                      'Column Name',
                                                      ' ',
                                                      _jsx('span', {
                                                        className:
                                                          'text-red-400',
                                                        children: '*',
                                                      }),
                                                    ],
                                                  }),
                                                  _jsx('input', {
                                                    ref: columnNameInputRef,
                                                    id: 'columnName',
                                                    name: 'columnName',
                                                    type: 'text',
                                                    value:
                                                      newColumnFormData.columnName,
                                                    onChange: handleInputChange,
                                                    onKeyDown: handleKeyDown,
                                                    placeholder: 'Enter name',
                                                    className:
                                                      'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm',
                                                    required: true,
                                                  }),
                                                ],
                                              }),
                                              _jsxs('div', {
                                                children: [
                                                  _jsx('label', {
                                                    htmlFor: 'dataType',
                                                    className:
                                                      'block text-sm font-medium text-gray-300 mb-1',
                                                    children: 'Data Type',
                                                  }),
                                                  _jsx(DataTypeSelector, {
                                                    id: 'dataType',
                                                    name: 'dataType',
                                                    value:
                                                      newColumnFormData.dataType,
                                                    onChange: handleInputChange,
                                                    onKeyDown: handleKeyDown,
                                                    className:
                                                      'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm',
                                                    required: true,
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                          _jsxs('div', {
                                            className:
                                              'grid grid-cols-1 md:grid-cols-2 gap-4',
                                            children: [
                                              _jsxs('div', {
                                                children: [
                                                  _jsx('label', {
                                                    htmlFor: 'defaultValue',
                                                    className:
                                                      'block text-sm font-medium text-gray-300 mb-1',
                                                    children: 'Default Value',
                                                  }),
                                                  _jsx('input', {
                                                    id: 'defaultValue',
                                                    name: 'defaultValue',
                                                    type: 'text',
                                                    value:
                                                      newColumnFormData.defaultValue,
                                                    onChange: handleInputChange,
                                                    onKeyDown: handleKeyDown,
                                                    placeholder: 'Optional',
                                                    className:
                                                      'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm',
                                                  }),
                                                ],
                                              }),
                                              _jsxs('div', {
                                                children: [
                                                  _jsx('label', {
                                                    htmlFor: 'foreignKey',
                                                    className:
                                                      'block text-sm font-medium text-gray-300 mb-1',
                                                    children: 'Foreign Key',
                                                  }),
                                                  _jsxs('select', {
                                                    id: 'foreignKey',
                                                    name: 'foreignKey',
                                                    value:
                                                      newColumnFormData
                                                        .foreignKey
                                                        ?.tableName ?? '',
                                                    onChange:
                                                      handleForeignKeyChange,
                                                    onKeyDown: handleKeyDown,
                                                    className:
                                                      'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm',
                                                    children: [
                                                      _jsx('option', {
                                                        value: '',
                                                        children: 'None',
                                                      }),
                                                      selectedTableIndex !==
                                                        null &&
                                                        getAvailableForeignTables(
                                                          schemaInfo[
                                                            selectedTableIndex
                                                          ],
                                                        ).map((tableName) =>
                                                          _jsx(
                                                            'option',
                                                            {
                                                              value: tableName,
                                                              children:
                                                                tableName,
                                                            },
                                                            tableName,
                                                          ),
                                                        ),
                                                    ],
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                      _jsxs('div', {
                                        className:
                                          'flex flex-wrap items-center gap-4',
                                        children: [
                                          _jsxs('div', {
                                            className:
                                              'flex items-center gap-4',
                                            children: [
                                              _jsxs('label', {
                                                className:
                                                  'flex items-center space-x-2 cursor-pointer',
                                                children: [
                                                  _jsx('input', {
                                                    name: 'isNullable',
                                                    type: 'checkbox',
                                                    checked:
                                                      newColumnFormData.isNullable,
                                                    onChange: handleInputChange,
                                                    onKeyDown: handleKeyDown,
                                                    className:
                                                      'w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500',
                                                  }),
                                                  _jsx('span', {
                                                    className:
                                                      'text-sm text-gray-300',
                                                    children: 'Nullable',
                                                  }),
                                                ],
                                              }),
                                              _jsxs('label', {
                                                className:
                                                  'flex items-center space-x-2 cursor-pointer',
                                                children: [
                                                  _jsx('input', {
                                                    name: 'isPrimary',
                                                    type: 'checkbox',
                                                    checked:
                                                      newColumnFormData.isPrimary,
                                                    onChange: handleInputChange,
                                                    onKeyDown: handleKeyDown,
                                                    className:
                                                      'w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500',
                                                  }),
                                                  _jsx('span', {
                                                    className:
                                                      'text-sm text-gray-300',
                                                    children: 'Primary',
                                                  }),
                                                ],
                                              }),
                                              _jsxs('label', {
                                                className:
                                                  'flex items-center space-x-2 cursor-pointer',
                                                children: [
                                                  _jsx('input', {
                                                    name: 'isUnique',
                                                    type: 'checkbox',
                                                    checked:
                                                      newColumnFormData.isUnique,
                                                    onChange: handleInputChange,
                                                    onKeyDown: handleKeyDown,
                                                    className:
                                                      'w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500',
                                                  }),
                                                  _jsx('span', {
                                                    className:
                                                      'text-sm text-gray-300',
                                                    children: 'Unique',
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                          newColumnFormData.foreignKey &&
                                            _jsx('div', {
                                              children: _jsxs('select', {
                                                id: 'relationType',
                                                name: 'relationType',
                                                value:
                                                  newColumnFormData.foreignKey
                                                    .relationType,
                                                onChange:
                                                  handleRelationTypeChange,
                                                onKeyDown: handleKeyDown,
                                                className:
                                                  'px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm',
                                                required: true,
                                                children: [
                                                  _jsx('option', {
                                                    value: '',
                                                    children: 'Relationship',
                                                  }),
                                                  _jsx('option', {
                                                    value: 'oneToOne',
                                                    children: 'One-to-One',
                                                  }),
                                                  _jsx('option', {
                                                    value: 'oneToMany',
                                                    children: 'One-to-Many',
                                                  }),
                                                ],
                                              }),
                                            }),
                                          isFormValid() &&
                                            _jsxs('div', {
                                              className:
                                                'ml-auto flex items-center gap-3',
                                              children: [
                                                _jsx('span', {
                                                  className:
                                                    'text-xs text-gray-400',
                                                  children: 'Ctrl + Enter',
                                                }),
                                                _jsx('button', {
                                                  type: 'submit',
                                                  className:
                                                    'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800',
                                                  children: 'Add Column',
                                                }),
                                              ],
                                            }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            (schemaInfo[selectedTableIndex].isPivot !== true ||
                              isPivotTableColumnsEditable) &&
                              _jsxs('div', {
                                className:
                                  'bg-gray-800/50 rounded-lg border border-gray-700 p-4 mt-4',
                                children: [
                                  _jsxs('h4', {
                                    className:
                                      'text-lg font-medium text-white mb-4 flex items-center',
                                    children: [
                                      _jsx('svg', {
                                        className:
                                          'w-5 h-5 mr-2 text-green-400',
                                        fill: 'none',
                                        stroke: 'currentColor',
                                        viewBox: '0 0 24 24',
                                        children: _jsx('path', {
                                          strokeLinecap: 'round',
                                          strokeLinejoin: 'round',
                                          strokeWidth: 2,
                                          d: 'M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7h16M4 7l1-4h14l1 4M9 11v6m6-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
                                        }),
                                      }),
                                      'Seed Data (YAML)',
                                    ],
                                  }),
                                  _jsxs('div', {
                                    className: 'space-y-4',
                                    children: [
                                      _jsxs('div', {
                                        children: [
                                          _jsxs('label', {
                                            htmlFor: 'yamlSeedData',
                                            className:
                                              'block text-sm font-medium text-gray-300 mb-2',
                                            children: [
                                              'Sample Data for',
                                              ' ',
                                              schemaInfo[selectedTableIndex]
                                                .tableName,
                                              ' table',
                                            ],
                                          }),
                                          _jsx('p', {
                                            className:
                                              'text-xs text-gray-400 mb-3',
                                            children:
                                              'Enter sample data in YAML format. Example: user types (superadmin, admin, user), product categories, etc.',
                                          }),
                                          _jsx('textarea', {
                                            id: 'yamlSeedData',
                                            value: yamlSeedData,
                                            onChange: handleYamlChange,
                                            placeholder: (() => {
                                              const table =
                                                schemaInfo[selectedTableIndex];
                                              if (
                                                table.columnsInfo.length === 0
                                              ) {
                                                return '- column1: value1\n  column2: value2\n- column1: value3\n  column2: value4';
                                              }
                                              const sampleRows = [1, 2]
                                                .map(() => {
                                                  const row = table.columnsInfo
                                                    .map((col) => {
                                                      const indent = '  ';
                                                      return `${indent}${col.column_name}: `;
                                                    })
                                                    .join('\n');
                                                  return `- ${row.replace(/^ {2}/, '')}`;
                                                })
                                                .join('\n');
                                              return sampleRows;
                                            })(),
                                            className:
                                              'w-full h-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono resize-vertical',
                                            style: { minHeight: '160px' },
                                          }),
                                        ],
                                      }),
                                      _jsxs('div', {
                                        className: 'flex items-center gap-3',
                                        children: [
                                          _jsx('button', {
                                            type: 'button',
                                            onClick: handleAddNewRow,
                                            className:
                                              'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800',
                                            children: 'New Row',
                                          }),
                                          _jsx('button', {
                                            type: 'button',
                                            onClick: handleSaveSeedData,
                                            className:
                                              'px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800',
                                            children: 'Save Seed Data',
                                          }),
                                          showSeedDataSuccess &&
                                            schemaInfo[selectedTableIndex]
                                              .data !== undefined &&
                                            _jsxs('span', {
                                              className:
                                                'text-sm text-green-400',
                                              children: [
                                                '\u2713 Seed data saved (',
                                                schemaInfo[selectedTableIndex]
                                                  .data.length || 0,
                                                ' ',
                                                'records)',
                                              ],
                                            }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                          ],
                        }),
                      ],
                    },
                    schemaInfo[selectedTableIndex].tableName,
                  ),
              }),
            ],
          }),
    ],
  });
}
export default SchemaBuilder;
