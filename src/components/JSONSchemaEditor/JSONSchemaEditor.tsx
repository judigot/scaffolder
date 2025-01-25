import React, { useState, useEffect, useRef } from 'react';
import JSON5 from 'json5';
import { useWordEditor } from '@/components/JSONSchemaEditor/hooks/useWordEditor.ts';
import { IJSONSchema } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import TableAdder from '@/components/TableAdder.tsx';
import { addPrimaryKeys } from '@/utils/common.ts';
import renameTable from '@/utils/renameTable.ts';

function JSONSchemaEditor() {
  const {
    formData: { schemaInput },
    setFormData,
    schemaInfo,
  } = useFormStore();

  const [schema, setSchema] = useState<IJSONSchema>(schemaInput);
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

  const { handleWordEdit } = useWordEditor(JSON.stringify(schema, null, 4));

  // Add effect to sync schema with formData.schemaInput
  useEffect(() => {
    setSchema(schemaInput);
  }, [schemaInput]);

  function repositionCursor() {
    if (textAreaRef.current) {
      textAreaRef.current.selectionStart = cursorPositionRef.current;
      textAreaRef.current.selectionEnd = cursorPositionRef.current;
    }
  }

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

    if (isTableNameEdited && newWord) {
      // Create a new schema with the renamed table using Object.entries/fromEntries
      const renamedSchema = Object.fromEntries(
        Object.entries(oldSchema).map(([key, value]) => [
          key === previousWord ? newWord : key,
          value,
        ]),
      );

      // Update the schema info to reflect the table rename
      const newSchemaInfo = renameTable({
        oldTableName: previousWord,
        newTableName: newWord,
        schemaInfo,
      });

      // Update both schema input and schema info
      setFormData({
        ...useFormStore.getState().formData,
        schemaInput: renamedSchema,
      });
      useFormStore.getState().setSchemaInfo(newSchemaInfo);
      setSchema(renamedSchema);
    } else {
      const processedSchema = addPrimaryKeys(updatedSchema);
      setSchema(processedSchema);
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

  return (
    <>
      <TableAdder />
      <textarea
        id="schemaInput"
        name="schemaInput"
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
