import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect } from 'react';
import TagInput from '../components/TagInput';
import { useAdditionalSchemaStore } from '../useAdditionalSchhemaSettings';
import useTransformationsStore from '../useTransformationsStore';
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
  const getSuggestions = (schema) => {
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
  return _jsx('div', {
    className: 'bg-gray-800 p-4 rounded-md flex flex-col items-center',
    children: _jsx('div', {
      className: 'overflow-x-auto w-full',
      children: _jsxs('table', {
        className: 'min-w-full border border-gray-300 bg-gray-900 text-center',
        children: [
          _jsx('thead', {
            className: 'bg-gray-700',
            children: _jsxs('tr', {
              children: [
                _jsx('th', {
                  className: 'border-b border-gray-600 px-4 py-2 text-gray-200',
                  children: 'Table Name',
                }),
                _jsx('th', {
                  className: 'border-b border-gray-600 px-4 py-2 text-gray-200',
                  children: 'Composite Unique',
                }),
                _jsx('th', {
                  className: 'border-b border-gray-600 px-4 py-2 text-gray-200',
                  children: 'Searchable',
                }),
              ],
            }),
          }),
          _jsx('tbody', {
            children: schemaInfo.map((schema) =>
              _jsxs(
                'tr',
                {
                  className: 'hover:bg-gray-700',
                  children: [
                    _jsx('td', {
                      className:
                        'border-b border-gray-600 px-4 py-2 text-gray-300',
                      children: schema.tableName,
                    }),
                    _jsx('td', {
                      className: 'border-b border-gray-600 px-4 py-2',
                      children: _jsx('div', {
                        className: 'relative',
                        children: _jsx(TagInput, {
                          id: `tag-input-${schema.tableName}`,
                          required: true,
                          placeholder: 'Add a composite unique field',
                          inputValue:
                            formData.inputValues[schema.tableName] ?? '',
                          onInputChange: (e) => {
                            setInputValue(schema.tableName, e.target.value);
                          },
                          addedValues:
                            formData.addedValues[schema.tableName] ?? [],
                          onAddValue: (newTags) => {
                            setAddedValues(schema.tableName, newTags);
                          },
                          suggestions: getSuggestions(schema),
                          showSuggestionsOnFocus: true,
                        }),
                      }),
                    }),
                    _jsx('td', {
                      className: 'border-b border-gray-600 px-4 py-2',
                      children: _jsx('input', {
                        id: `searchable-${schema.tableName}`,
                        name: `searchable-${schema.tableName}`,
                        type: 'checkbox',
                        className: 'form-checkbox h-4 w-4 text-indigo-600',
                        checked: formData.searchable[schema.tableName] ?? false,
                        onChange: (e) => {
                          setSearchable(schema.tableName, e.target.checked);
                        },
                      }),
                    }),
                  ],
                },
                schema.tableName,
              ),
            ),
          }),
        ],
      }),
    }),
  });
}
export default AdditionalSchemaSettings;
