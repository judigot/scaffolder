import { useEffect } from 'react';
import TagInput from '@/components/TagInput.tsx';
import { useAdditionalSchemaStore } from '@/useAdditionalSchhemaSettings.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';

function AdditionalSchemaSettings() {
  const {
    additionalSettings: formData,
    setInputValue,
    setAddedValues,
    setSearchable,
    resetFormData,
  } = useAdditionalSchemaStore();
  const { schemaInfo } = useTransformationsStore();

  /* Initialize missing tables when component mounts or schema changes */
  useEffect(() => {
    const hasMissingTables = schemaInfo.some(
      (schema) => !(schema.tableName in formData.inputValues),
    );

    if (hasMissingTables) {
      resetFormData(schemaInfo);
    }
  }, [schemaInfo, formData, resetFormData]);

  const getSuggestions = (schema: ISchemaInfo): string[] => {
    const primaryKeys = schema.columnsInfo
      .filter((column) => column.primary_key ?? false)
      .map((column) => column.column_name);

    const foreignKeys = schema.columnsInfo
      .filter((column) => column.foreign_key !== undefined)
      .map((column) => column.foreign_key?.foreign_column_name ?? '');

    // prettier-ignore
    return [...new Set([
      ...primaryKeys,
      ...foreignKeys
    ])];
  };

  return (
    <div className="bg-gray-800 p-4 rounded-md flex flex-col items-center">
      <div className="overflow-x-auto w-full">
        <table className="min-w-full border border-gray-300 bg-gray-900 text-center">
          <thead className="bg-gray-700">
            <tr>
              <th className="border-b border-gray-600 px-4 py-2 text-gray-200">
                Table Name
              </th>
              <th className="border-b border-gray-600 px-4 py-2 text-gray-200">
                Composite Unique
              </th>
              <th className="border-b border-gray-600 px-4 py-2 text-gray-200">
                Searchable
              </th>
            </tr>
          </thead>
          <tbody>
            {schemaInfo.map((schema) => (
              <tr key={schema.tableName} className="hover:bg-gray-700">
                <td className="border-b border-gray-600 px-4 py-2 text-gray-300">
                  {schema.tableName}
                </td>
                <td className="border-b border-gray-600 px-4 py-2">
                  <div className="relative">
                    <TagInput
                      id={`tag-input-${schema.tableName}`}
                      required={true}
                      placeholder="Add a composite unique field"
                      inputValue={formData.inputValues[schema.tableName] ?? ''}
                      onInputChange={(e) => {
                        setInputValue(schema.tableName, e.target.value);
                      }}
                      addedValues={formData.addedValues[schema.tableName] ?? []}
                      onAddValue={(newTags) => {
                        setAddedValues(schema.tableName, newTags);
                      }}
                      suggestions={getSuggestions(schema)}
                      showSuggestionsOnFocus={true}
                    />
                  </div>
                </td>
                <td className="border-b border-gray-600 px-4 py-2">
                  <input
                    id={`searchable-${schema.tableName}`}
                    name={`searchable-${schema.tableName}`}
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-indigo-600"
                    checked={formData.searchable[schema.tableName] ?? false}
                    onChange={(e) => {
                      setSearchable(schema.tableName, e.target.checked);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdditionalSchemaSettings;
