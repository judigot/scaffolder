import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useModalStore } from '../components/Modal/base/modalStore';
import { useState, useRef, useEffect } from 'react';
function InputValueModal({ id, oldValue, resolve }) {
  const [inputValue, setInputValue] = useState(oldValue);
  const inputRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    // Resolve with the updated value
    resolve(trimmedValue);
    useModalStore.getState().closeModal(id);
  };
  const handleCancel = () => {
    // Resolve with an empty string and close the modal
    resolve('');
    useModalStore.getState().closeModal(id);
  };
  // Computed conditions for button visibility
  const trimmedValue = inputValue.trim();
  const isEmpty = !trimmedValue;
  const isUnchanged = trimmedValue === oldValue.trim();
  return _jsxs('form', {
    onSubmit: handleSubmit,
    children: [
      _jsx('input', {
        type: 'text',
        ref: inputRef,
        value: inputValue,
        onChange: (e) => {
          setInputValue(e.target.value);
        },
        className:
          'block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-4 py-3',
      }),
      _jsx('br', {}),
      _jsxs('div', {
        className: 'flex justify-end gap-3',
        children: [
          _jsx('button', {
            type: 'button',
            onClick: handleCancel,
            className:
              'px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600',
            children: 'Cancel',
          }),
          !isEmpty &&
            !isUnchanged &&
            _jsx('button', {
              type: 'submit',
              className:
                'px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500',
              children: 'Confirm',
            }),
        ],
      }),
    ],
  });
}
export default InputValueModal;
