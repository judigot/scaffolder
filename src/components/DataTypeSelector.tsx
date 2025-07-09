import React from 'react';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useFormStore } from '@/useFormStore.ts';

interface IDataTypeSelectorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

// Type guard function to check if value is a Record<string, unknown>
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Helper function to safely get database-specific type
const getDbSpecificType = (typeMapping: unknown, dbType: string): string => {
  if (isRecord(typeMapping) && dbType in typeMapping) {
    const dbTypeValue = typeMapping[dbType];
    if (typeof dbTypeValue === 'string') {
      return dbTypeValue;
    }
  }
  return '';
};

const DataTypeSelector: React.FC<IDataTypeSelectorProps> = ({
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
      const groups: Record<string, { value: string; label: string }[]> = {};
      
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

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={className}
        required={required}
      >
        {Object.entries(groupedOptions).map(([groupName, options]) => (
          <optgroup key={groupName} label={groupName}>
            {options.map((option) => {
              // Split the label to identify the database type part
              const parts = option.label.split(' - ');
              const hasDbType = parts.length > 1;
              
              if (hasDbType) {
                const name = parts[0];
                const dbType = parts[1];
                // Use Unicode characters to create visual separation
                const displayLabel = `${name} ⸺ ${dbType}`;
                
                return (
                  <option 
                    key={option.value} 
                    value={option.value}
                  >
                    {displayLabel}
                  </option>
                );
              }
              
              return (
                <option 
                  key={option.value} 
                  value={option.value}
                >
                  {option.label}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

export default DataTypeSelector;
