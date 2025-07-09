import React from 'react';

interface IDataTypeSelectorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}

const DataTypeSelector: React.FC<IDataTypeSelectorProps> = ({
  value,
  onChange,
  onKeyDown,
  className = '',
  id,
  name,
  required = false,
}) => {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      required={required}
    >
      <option value="string">String</option>
      <option value="number">Number</option>
      <option value="float">Float</option>
      <option value="Date">Date</option>
      <option value="boolean">Boolean</option>
    </select>
  );
};

export default DataTypeSelector; 