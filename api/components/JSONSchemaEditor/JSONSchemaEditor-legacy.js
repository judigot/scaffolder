import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState, useEffect, useRef } from 'react';
import JSON5 from 'json5';
import { useWordEditor } from '../../components/JSONSchemaEditor/hooks/useWordEditor';
import { useFormStore } from '../../useFormStore';
const App = () => {
  const { schemaInput, setFormData } = useFormStore();
  const [schema, setSchema] = useState(schemaInput);
  const [newTableName, setNewTableName] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const textAreaRef = useRef(null);
  const cursorPositionRef = useRef(0);
  const { handleWordEdit } = useWordEditor(JSON.stringify(schema, null, 4));
  function repositionCursor() {
    if (textAreaRef.current) {
      textAreaRef.current.selectionStart = cursorPositionRef.current;
      textAreaRef.current.selectionEnd = cursorPositionRef.current;
    }
  }
  useEffect(() => {
    setSchema(schemaInput);
  }, [schemaInput]);
  useEffect(() => {
    if (useFormStore.getState().schemaInput !== schema) {
      repositionCursor();
      useFormStore.setState({ schemaInput: schema });
    }
  }, [schema, setFormData]);
  const handleAddTable = () => {
    if (newTableName) {
      const newTableId = `${newTableName}_id`;
      // Check if newTableId already exists in the schema
      const doesTableIdExist = Object.values(schema).some((rows) =>
        rows.some((row) => newTableId in row),
      );
      if (!doesTableIdExist) {
        setSchema((prevSchema) => ({
          ...prevSchema,
          [newTableName]: [{ [newTableId]: 1 }],
        }));
        setNewTableName('');
      }
    }
  };
  const handleInputChange = (event) => {
    setNewTableName(event.target.value);
  };
  const renameProperty = (item, oldProp, newProp) => {
    const newItem = {};
    for (const key in item) {
      if (key === oldProp) {
        newItem[newProp] = item[key];
      } else {
        newItem[key] = item[key];
      }
    }
    return newItem;
  };
  const handleSchemaChange = (e) => {
    /* Tests:
        Test 1: Rename Table and Update Primary Key
        Before editing:
        { user: [ { user_id: 1, name: 'John Doe' } ], }
        Expected output:
        { userx: [ { userx_id: 1, name: 'John Doe' } ], }
      
        Test 2: Rename Table and Retain Additional Properties
        Before editing:
        { user: [ { user_id: 1, name: 'John Doe', desc: 1 } ], }
        Expected output:
        { userx: [ { userx_id: 1, name: 'John Doe', desc: 1 } ], }
      
        Test 3: Edit Row Values
        Before editing:
        { user: [ { user_id: 1, name: 'John Doe', desc: 1 } ], }
        Expected output:
        { user: [ { user_id: 1, name: 'John Doe', desc: 'Lorem ipsum' } ], }
      
        Test 4: Rename Table and Update Foreign Keys
        Before editing:
        {
          user: [ { user_id: 1, name: 'John Doe' } ],
          order: [ { order_id: 1, user_id: 1 } ],
        }
        Expected output:
        {
          userx: [ { userx_id: 1, name: 'John Doe' } ],
          order: [ { order_id: 1, userx_id: 1 } ],
        }
        */
    const addPrimaryKeys = (schema) => {
      const newSchema = {};
      Object.keys(schema).forEach((table) => {
        newSchema[table] = schema[table].map((row, index) => {
          const validPKFormats = [`${table}_id`, 'id'];
          const firstKey = Object.keys(row)[0];
          const isFirstKeyValidPKFormat = validPKFormats.includes(firstKey);
          if (!isFirstKeyValidPKFormat) {
            const primaryKey = `${table}_id`;
            const newRow = { [primaryKey]: index + 1 }; // Primary key as the first property
            // Add remaining properties
            Object.keys(row).forEach((key) => {
              if (key !== primaryKey) {
                newRow[key] = row[key];
              }
            });
            return newRow;
          }
          // Return unchanged first key since it's valid
          return row;
        });
      });
      return newSchema;
    };
    const { previousWord, newWord } = handleWordEdit(e);
    const schemaStringBeforeEditing = JSON.stringify(schema, null, 4);
    const newSchemaString = e.target.value;
    cursorPositionRef.current = e.target.selectionStart;
    const oldSchema = JSON5.parse(schemaStringBeforeEditing);
    let updatedSchema;
    try {
      updatedSchema = JSON5.parse(newSchemaString);
      setIsValidJson(true);
    } catch {
      updatedSchema = oldSchema;
      setIsValidJson(false);
    }
    if (updatedSchema === undefined) {
      return;
    }
    const isTableNameEdited =
      previousWord in oldSchema && !(previousWord in updatedSchema);
    if (isTableNameEdited) {
      const newSchema = {};
      const previousWordId = `${previousWord}_id`;
      const newWordId = `${newWord}_id`;
      // Store foreign key values for later update
      const foreignKeyValues = {};
      // Collect foreign key values and prepare the new schema
      for (const [tableName, rows] of Object.entries(oldSchema)) {
        if (tableName === previousWord) {
          newSchema[newWord] = rows.map((item) => {
            const newItem = renameProperty(item, previousWordId, newWordId);
            return newItem;
          });
        } else {
          newSchema[tableName] = rows.map((item, index) => {
            if (previousWordId in item) {
              foreignKeyValues[tableName] = {};
              foreignKeyValues[tableName][index] = item[previousWordId];
            }
            return { ...item };
          });
        }
      }
      // Update foreign key values in the new schema
      for (const [tableName, rows] of Object.entries(newSchema)) {
        newSchema[tableName] = rows.map((item) => {
          return renameProperty(item, previousWordId, newWordId);
        });
      }
      // Ensure the old table is removed from the schema
      const updatedSchemaWithoutOldTable = Object.fromEntries(
        Object.entries(newSchema).filter(([key]) => key !== previousWord),
      );
      setSchema(updatedSchemaWithoutOldTable);
    } else {
      setSchema(addPrimaryKeys(updatedSchema));
    }
  };
  const handleKeyDown = (e) => {
    if ('key' in e && e.key === 'Enter') {
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue =
        value.slice(0, selectionStart) + '\n' + value.slice(selectionEnd);
      setSchema(JSON5.parse(newValue));
      cursorPositionRef.current = selectionStart + 1;
      e.preventDefault();
    }
  };
  return _jsxs(_Fragment, {
    children: [
      _jsxs('div', {
        className: 'mb-4',
        children: [
          _jsx('input', {
            id: 'newTableName',
            type: 'text',
            placeholder: 'Enter table name',
            value: newTableName,
            onChange: handleInputChange,
            className:
              'mb-4 p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
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
      }),
      _jsx('textarea', {
        ref: textAreaRef,
        rows: 10,
        className:
          'p-2 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
        value: JSON.stringify(schema, null, 4),
        onChange: handleSchemaChange,
        onKeyUp: handleKeyDown,
      }),
      !isValidJson &&
        _jsx('p', {
          className: 'mt-2 text-sm text-red-600 dark:text-red-400',
          children: 'Invalid JSON format. Please correct it.',
        }),
    ],
  });
};
export default App;
