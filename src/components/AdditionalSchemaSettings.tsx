import { ISchemaInfo } from '@/interfaces/interfaces';
import TagInput from '@/components/TagInput';
import { useState, useEffect } from 'react';

interface IProps {
  schemaInfo: ISchemaInfo[];
}

interface IFormData {
  inputValues: Record<string, string>; // Individual input values for each table
  addedValues: Record<string, string[]>; // Tags for each table
}

function AdditionalSchemaSettings({ schemaInfo }: IProps) {
  const [formData, setFormData] = useState<IFormData>({
    inputValues: {}, // Store input values for each schema table
    addedValues: {}, // Store added values (tags) for each schema table
  });

  /* Ensure that formData resets when schemaInfo changes */
  useEffect(() => {
    const initialFormData = schemaInfo.reduce<IFormData>(
      (acc, schema) => ({
        inputValues: {
          ...acc.inputValues,
          [schema.table]: '', // Initialize input values for each table
        },
        addedValues: {
          ...acc.addedValues,
          [schema.table]: [], // Initialize added values for each table
        },
      }),
      { inputValues: {}, addedValues: {} },
    );
    setFormData(initialFormData);
  }, [schemaInfo]);

  const getSuggestions = (schema: ISchemaInfo): string[] => {
    // const primaryKeys = schema.columnsInfo
    //   .filter((column) => column.primary_key)
    //   .map((column) => column.column_name);

    const foreignKeys = schema.columnsInfo
      .filter((column) => column.foreign_key)
      .map((column) => column.foreign_key?.foreign_column_name ?? '');

    // prettier-ignore
    return [...new Set([
      // ...primaryKeys,
      ...foreignKeys
    ])];
  };

  const handleTagInputChange = (
    schemaTable: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setFormData((prev) => ({
      ...prev,
      inputValues: {
        ...prev.inputValues,
        [schemaTable]: e.target.value, // Update specific input value for the table
      },
    }));
  };

  const handleAddTags = (schemaTable: string, newTags: string[]): void => {
    setFormData((prev) => ({
      ...prev,
      addedValues: {
        ...prev.addedValues,
        [schemaTable]: newTags, // Add tags specific to the table
      },
      inputValues: {
        ...prev.inputValues,
        [schemaTable]: '', // Clear the input field after tags are added
      },
    }));
  };

  return (
    <div className="bg-gray-800 p-4 rounded-md flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4 text-center">
        Additional Schema Settings
      </h2>
      <table className="min-w-full border border-gray-300 bg-gray-900 overflow-visible text-center relative">
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
            <tr key={schema.table} className="hover:bg-gray-700">
              <td className="border-b border-gray-600 px-4 py-2 text-gray-300">
                {schema.table}
              </td>
              <td className="border-b border-gray-600 px-4 py-2">
                <div className="relative">
                  <TagInput
                    id={`tag-input-${schema.table}`}
                    required={true}
                    placeholder="Add a composite unique field"
                    inputValue={formData.inputValues[schema.table] ?? ''} // Use specific input value
                    onInputChange={(e) => {
                      handleTagInputChange(schema.table, e);
                    }} // Handle change for specific table
                    addedValues={formData.addedValues[schema.table] ?? []} // Use specific added values
                    onAddValue={(newTags) => {
                      handleAddTags(schema.table, newTags);
                    }} // Handle adding tags for specific table
                    suggestions={getSuggestions(schema)}
                    showSuggestionsOnFocus={true}
                  />
                </div>
              </td>
              <td className="border-b border-gray-600 px-4 py-2">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-indigo-600"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* For debugging or inspection, this can be removed later */}
      <pre className="mt-4 text-sm text-gray-400">
        {JSON.stringify(formData, null, 4)}
      </pre>
    </div>
  );
}

export default AdditionalSchemaSettings;
