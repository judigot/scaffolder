import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
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
}) {
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  useEffect(() => {
    if (inputValue.trim()) {
      filterAndSetSuggestions(inputValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, addedValues]);
  const handleChange = (e) => {
    onInputChange(e);
  };
  const addValue = (tag) => {
    if (!addedValues.includes(tag)) {
      const newTags = [...addedValues, tag];
      onAddValue(newTags);
    }
  };
  const removeValue = (index) => {
    const newTags = addedValues.filter((_, i) => i !== index);
    onAddValue(newTags);
  };
  const filterAndSetSuggestions = (input) => {
    const filtered = suggestions.filter(
      (suggestion) =>
        suggestion.toLowerCase().includes(input.toLowerCase()) &&
        !addedValues.includes(suggestion),
    );
    setFilteredSuggestions(filtered);
  };
  const filterUnselectedSuggestions = (currentSuggestion) => {
    return suggestions.filter(
      (item) => !addedValues.includes(item) && item !== currentSuggestion,
    );
  };
  const addSuggestion = (suggestion) => {
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
  const handleSuggestionClick = (suggestion) => {
    addSuggestion(suggestion);
  };
  const handleKeyDown = (e) => {
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
  return _jsxs(
    'div',
    {
      className: `relative flex items-center flex-wrap gap-2 px-3 py-2 rounded-md bg-gray-700 border ${isFocused ? 'border-blue-500 ring-blue-500' : 'border-gray-600'}`,
      children: [
        addedValues.map((value, index) =>
          _jsxs(
            'span',
            {
              className:
                'flex items-center bg-blue-700 text-white rounded-full text-sm px-2 py-1 mr-2',
              children: [
                value,
                _jsx('button', {
                  type: 'button',
                  onClick: () => {
                    removeValue(index);
                  },
                  className:
                    'bg-blue-700 hover:bg-blue-500 rounded-full ml-2 inline-flex items-center justify-center w-6 h-6',
                  'aria-label': `Remove ${value}`,
                  children: '\u00D7',
                }),
              ],
            },
            `${id}-${String(index)}`,
          ),
        ),
        _jsx('input', {
          required: addedValues.length === 0 && required,
          type: 'text',
          id: id,
          name: id,
          placeholder: placeholder,
          value: inputValue,
          onChange: handleChange,
          onKeyDown: handleKeyDown,
          onFocus: handleFocus,
          onBlur: handleBlur,
          className:
            'flex-1 bg-transparent text-white outline-none min-w-[100px] basis-[100px]',
        }),
        showSuggestions &&
          filteredSuggestions.length > 0 &&
          _jsx('ul', {
            className:
              'absolute left-0 top-full mt-1 w-full bg-gray-600 rounded shadow-lg z-50',
            children: filteredSuggestions.map((suggestion, index) =>
              _jsx(
                'li',
                {
                  className:
                    'p-2 cursor-pointer text-white hover:bg-gray-500 rounded-t-md first:rounded-t-md last:rounded-b-md',
                  onClick: () => {
                    handleSuggestionClick(suggestion);
                  },
                  onKeyDown: () => {
                    // Handle keyboard interactions if needed
                  },
                  role: 'option', // Defines this as an option in a list
                  tabIndex: 0,
                  'aria-label': `Suggestion: ${suggestion}`,
                  'aria-selected': false,
                  children: suggestion,
                },
                index,
              ),
            ),
          }),
      ],
    },
    id,
  );
}
export default TagInput;
