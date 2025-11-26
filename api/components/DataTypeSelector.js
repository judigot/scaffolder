import { jsx as _jsx } from 'react/jsx-runtime';
import { useMockDatabaseStore } from '../useMockDatabaseStore';
import { useFormStore } from '../useFormStore';
// Type guard function to check if value is a Record<string, unknown>
const isRecord = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};
// Helper function to safely get database-specific type
const getDbSpecificType = (typeMapping, dbType) => {
  if (isRecord(typeMapping) && dbType in typeMapping) {
    const dbTypeValue = typeMapping[dbType];
    if (typeof dbTypeValue === 'string') {
      return dbTypeValue;
    }
  }
  return '';
};
const DataTypeSelector = ({
  value,
  onChange,
  onKeyDown,
  className = '',
  id,
  name,
  required = false,
}) => {
  const { typeMappings } = useMockDatabaseStore();
  const { dbType } = useFormStore();
  // Get available data types grouped by their info.group value
  const getGroupedDataTypeOptions = () => {
    if (typeMappings && dbType) {
      const groups = {};
      Object.keys(typeMappings).forEach((key) => {
        const typeMapping = typeMappings[key];
        let groupName = 'Other';
        // Check if typeMapping has info.group with proper type checking
        if (
          typeMapping !== null &&
          typeof typeMapping === 'object' &&
          'info' in typeMapping &&
          typeMapping.info !== null &&
          typeof typeMapping.info === 'object' &&
          'group' in typeMapping.info &&
          typeof typeMapping.info.group === 'string'
        ) {
          groupName = typeMapping.info.group;
        }
        // Get the database-specific type
        const dbSpecificType = getDbSpecificType(typeMapping, dbType);
        if (!(groupName in groups)) {
          groups[groupName] = [];
        }
        // Create label with database-specific type
        const label = dbSpecificType ? `${key} - ${dbSpecificType}` : key;
        groups[groupName].push({
          value: key,
          label,
        });
      });
      return groups;
    }
    // Fallback to ungrouped options if typeMappings is not available
    return {
      'Basic Types': [
        { value: 'string', label: 'string' },
        { value: 'number', label: 'number' },
        { value: 'float', label: 'float' },
        { value: 'Date', label: 'Date' },
        { value: 'boolean', label: 'boolean' },
      ],
    };
  };
  const groupedOptions = getGroupedDataTypeOptions();
  return _jsx('div', {
    className: 'relative',
    children: _jsx('select', {
      id: id,
      name: name,
      value: value,
      onChange: onChange,
      onKeyDown: onKeyDown,
      className: className,
      required: required,
      children: Object.entries(groupedOptions).map(([groupName, options]) =>
        _jsx(
          'optgroup',
          {
            label: groupName,
            children: options.map((option) => {
              // Split the label to identify the database type part
              const parts = option.label.split(' - ');
              const hasDbType = parts.length > 1;
              if (hasDbType) {
                const name = parts[0];
                const dbType = parts[1];
                // Use Unicode characters to create visual separation
                const displayLabel = `${name} ⸺ ${dbType}`;
                return _jsx(
                  'option',
                  { value: option.value, children: displayLabel },
                  option.value,
                );
              }
              return _jsx(
                'option',
                { value: option.value, children: option.label },
                option.value,
              );
            }),
          },
          groupName,
        ),
      ),
    }),
  });
};
export default DataTypeSelector;
