import React, { useState, useEffect, useRef } from 'react';
import JSON5 from 'json5';
import { useWordEditor } from '@/components/JSONSchemaEditor/hooks/useWordEditor.ts';
import { IJSONSchema } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import TableAdder from '@/components/TableAdder.tsx';
import { getPrimaryKey } from '@/utils/common.ts';

function JSONSchemaEditor() {
  const {
    formData: { schemaInput },
    setFormData,
  } = useFormStore();

  const [schema, setSchema] = useState<IJSONSchema>(schemaInput);
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

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
    if (useFormStore.getState().formData.schemaInput !== schema) {
      repositionCursor();
      setFormData({
        ...useFormStore.getState().formData,
        schemaInput: schema,
      });
    }
  }, [schema, setFormData]);

  const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    type IPrimaryKey = Record<string, unknown>;

    const addPrimaryKeys = (
      schema: Record<string, IPrimaryKey[]>,
    ): Record<string, IPrimaryKey[]> => {
      const newSchema: Record<string, IPrimaryKey[]> = {};

      Object.keys(schema).forEach((table) => {
        newSchema[table] = schema[table].map((row, index) => {
          const validPKFormats: string[] = [`${table}_id`, 'id'];
          const firstKey = Object.keys(row)[0];
          const isFirstKeyValidPKFormat = validPKFormats.includes(firstKey);
          if (!isFirstKeyValidPKFormat) {
            const primaryKey = `${table}_id`;
            const newRow: IPrimaryKey = { [primaryKey]: index + 1 }; // Primary key as the first property

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
    const oldSchema: IJSONSchema = JSON5.parse(schemaStringBeforeEditing);

    let updatedSchema: IJSONSchema | undefined = undefined;

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
      const newSchema: IJSONSchema = {};
      const { schemaInfo } = useFormStore.getState();
      let previousTablePrimaryKey = `${previousWord}_id`;
      let newTablePrimaryKey = `${newWord}_id`;

      const findPrimaryKey = (tableName: string): string | null => {
        try {
          return getPrimaryKey({
            tableName,
            schemaInfo,
          });
        } catch {
          return null;
        }
      };

      const previousPK = findPrimaryKey(previousWord);
      const newPK = findPrimaryKey(newWord);

      if (previousPK !== null) {
        previousTablePrimaryKey = previousPK;
      }
      if (newPK !== null) {
        newTablePrimaryKey = newPK;
      }

      // Store foreign key values for later update
      const foreignKeyValues: Record<string, Record<string, unknown>> = {};

      // Collect foreign key values and prepare the new schema
      for (const [tableName, rows] of Object.entries(oldSchema)) {
        if (tableName === previousWord) {
          newSchema[newWord] = rows.map((item) => {
            const newItem = renameProperty(item, previousTablePrimaryKey, newTablePrimaryKey);
            return newItem;
          });
        } else {
          newSchema[tableName] = rows.map((item, index) => {
            if (previousTablePrimaryKey in item) {
              foreignKeyValues[tableName] = {};
              foreignKeyValues[tableName][index] = item[previousTablePrimaryKey];
            }
            return { ...item };
          });
        }
      }

      // Update foreign key values in the new schema
      for (const [tableName, rows] of Object.entries(newSchema)) {
        newSchema[tableName] = rows.map((item) => {
          return renameProperty(item, previousTablePrimaryKey, newTablePrimaryKey);
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

  const handleKeyDown = (
    e:
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if ('key' in e && e.key === 'Enter') {
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue =
        value.slice(0, selectionStart) + '\n' + value.slice(selectionEnd);
      setSchema(JSON5.parse(newValue));
      cursorPositionRef.current = selectionStart + 1;
      e.preventDefault();
    }
  };

  const renameProperty = (
    item: Record<string, unknown>,
    oldProp: string,
    newProp: string,
  ): Record<string, unknown> => {
    const newItem: Record<string, unknown> = {};
    for (const key in item) {
      if (key === oldProp) {
        newItem[newProp] = item[key];
      } else {
        newItem[key] = item[key];
      }
    }
    return newItem;
  };

  return (
    <>
      <TableAdder />
      <textarea
        ref={textAreaRef}
        rows={10}
        className="p-2 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
        value={JSON.stringify(schema, null, 4)}
        onChange={handleSchemaChange}
        onKeyUp={handleKeyDown}
      />
      {!isValidJson && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Invalid JSON format. Please correct it.
        </p>
      )}
    </>
  );
}

export default JSONSchemaEditor;
