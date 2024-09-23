import React, { useState, useEffect } from 'react';

function TagInput({
  id,
  required,
  placeholder = 'Enter values',
  inputValue = '',
  onInputChange,
  addedValues,
  suggestions = [
    'Suggestion 1',
    'Suggestion 2',
    'Suggestion 3',
    'Suggestion 4',
  ],
  onAddValue,
  showSuggestionsOnFocus = true, // New prop to control suggestions on focus
}: {
  id: string;
  required: boolean;
  placeholder?: string;
  inputValue?: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addedValues: string[];
  onAddValue: (newTags: string[]) => void;
  suggestions?: string[];
  showSuggestionsOnFocus?: boolean; // New boolean prop
}) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  useEffect(() => {
    if (inputValue.trim()) {
      filterAndSetSuggestions(inputValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, addedValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e);
  };

  const addValue = (tag: string) => {
    if (!addedValues.includes(tag)) {
      const newTags = [...addedValues, tag];
      onAddValue(newTags);
    }
  };

  const removeValue = (index: number) => {
    const newTags = addedValues.filter((_, i) => i !== index);
    onAddValue(newTags);
  };

  const filterAndSetSuggestions = (input: string) => {
    const filtered = suggestions.filter(
      (suggestion) =>
        suggestion.toLowerCase().includes(input.toLowerCase()) &&
        !addedValues.includes(suggestion),
    );
    setFilteredSuggestions(filtered);
  };

  const filterUnselectedSuggestions = (currentSuggestion?: string) => {
    return suggestions.filter(
      (item) => !addedValues.includes(item) && item !== currentSuggestion,
    );
  };

  const addSuggestion = (suggestion: string) => {
    const suggestionVal = suggestion.trim();
    addValue(suggestionVal);
    const updatedSuggestions = filterUnselectedSuggestions(suggestionVal);
    setFilteredSuggestions(updatedSuggestions);

    const element = document.querySelector(`#${id}`);
    if (element instanceof HTMLElement) {
      setIsFocused(true);
      setTimeout(() => {
        if (showSuggestionsOnFocus) {
          setShowSuggestions(true);
        }
      }, 200);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addSuggestion(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addSuggestion(inputValue);
    }
  };

  const showAllUnselectedSuggestions = () => {
    const unselectedSuggestions = filterUnselectedSuggestions();
    setFilteredSuggestions(unselectedSuggestions);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (showSuggestionsOnFocus) {
      showAllUnselectedSuggestions();
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div
      key={id}
      className={`relative flex items-center flex-wrap gap-2 px-3 py-2 rounded-md bg-gray-700 border ${
        isFocused ? 'border-blue-500 ring-blue-500' : 'border-gray-600'
      }`}
    >
      {addedValues.map((value, index) => (
        <span
          key={`${id}-${String(index)}`}
          className="flex items-center bg-blue-700 text-white rounded-full text-sm px-2 py-1 mr-2"
        >
          {value}
          <button
            type="button"
            onClick={() => {
              removeValue(index);
            }}
            className="bg-blue-700 hover:bg-blue-500 rounded-full ml-2 inline-flex items-center justify-center w-6 h-6"
            aria-label={`Remove ${value}`}
          >
            &times;
          </button>
        </span>
      ))}

      <input
        required={addedValues.length === 0 && required}
        type="text"
        id={id}
        name={id}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="flex-1 bg-transparent text-white outline-none min-w-[100px] basis-[100px]"
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute left-0 top-full mt-1 w-full bg-gray-600 rounded shadow-lg z-50">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              className="p-2 cursor-pointer text-white hover:bg-gray-500 rounded-t-md first:rounded-t-md last:rounded-b-md"
              onClick={() => {
                handleSuggestionClick(suggestion);
              }}
              onKeyDown={() => {
                // Handle keyboard interactions if needed
              }}
              role="option" // Defines this as an option in a list
              tabIndex={0} // Makes the suggestion focusable
              aria-label={`Suggestion: ${suggestion}`} // Provides a label for accessibility
              aria-selected={false} // Indicates selection state
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TagInput;
