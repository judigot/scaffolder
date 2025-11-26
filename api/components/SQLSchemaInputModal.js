import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useFormStore } from '../useFormStore';
import { useModalStore } from '../useModalStore';
import useTransformationsStore from '../useTransformationsStore';
import { getApiUrl } from '../utils/getApiUrl';
import { useEffect, useState } from 'react';
function SQLSchemaInputModal() {
  const { dbConnection } = useFormStore();
  const { isSQLSchemaModalOpen, setIsSQLSchemaModalOpen, SQLSchemaEditable } =
    useModalStore();
  const { setIntrospectedSchema } = useTransformationsStore();
  const [formData, setFormData] = useState({ SQLSchemaEditable: '' });
  const [isEdited, setIsEdited] = useState(false);
  useEffect(() => {
    setFormData({ SQLSchemaEditable });
    setIsEdited(false);
  }, [SQLSchemaEditable]);
  const handleInputChange = (e) => {
    const { value } = e.currentTarget;
    setFormData({ SQLSchemaEditable: value });
    setIsEdited(true);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    function isSchemaInput(data) {
      return (
        data !== null &&
        typeof data === 'object' &&
        'SQLSchemaEditable' in data &&
        typeof data.SQLSchemaEditable === 'string'
      );
    }
    if (isSchemaInput(data)) {
      fetch(`${getApiUrl()}/executeCustomSchema`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbConnection,
          SQLSchemaEditable: data.SQLSchemaEditable,
        }),
      })
        .then((response) => response.json())
        .then((schemaInfoNew) => {
          setIntrospectedSchema(schemaInfoNew);
        })
        .catch(() => {
          // Handle error
        });
      setIsSQLSchemaModalOpen(false);
      setIsEdited(false);
      resetForm();
    }
  };
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isEdited) {
      setIsSQLSchemaModalOpen(false);
      resetForm();
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !isEdited) {
      setIsSQLSchemaModalOpen(false);
      resetForm();
    }
  };
  const resetForm = () => {
    setIsEdited(false);
  };
  if (!isSQLSchemaModalOpen) {
    return null;
  }
  return _jsx('div', {
    onClick: handleBackdropClick,
    className:
      'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center',
    onKeyDown: () => {
      //
    },
    role: 'button',
    tabIndex: 0,
    'aria-label': 'Close modal',
    children: _jsxs('div', {
      className:
        'bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full space-y-4',
      children: [
        _jsx('h1', {
          className: 'text-lg font-bold text-white',
          children: 'Edit SQL Schema',
        }),
        _jsxs('form', {
          id: 'schemaInputForm',
          name: 'schemaInputForm',
          className: 'flex flex-col space-y-4',
          onSubmit: handleSubmit,
          children: [
            _jsx('div', {
              children: _jsx('textarea', {
                id: 'SQLSchemaEditable',
                name: 'SQLSchemaEditable',
                value: formData.SQLSchemaEditable,
                onChange: handleInputChange,
                onKeyDown: handleKeyDown,
                rows: 10,
                className:
                  'h-[150px] p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
              }),
            }),
            _jsxs('div', {
              className: 'flex justify-end space-x-3',
              children: [
                _jsx('button', {
                  type: 'button',
                  className:
                    'mt-2 px-4 py-2 bg-gray-500 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                  onClick: () => {
                    setIsSQLSchemaModalOpen(false);
                    resetForm();
                  },
                  children: 'Cancel',
                }),
                _jsx('button', {
                  type: 'submit',
                  className:
                    'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50',
                  children: 'Execute Query',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}
export default SQLSchemaInputModal;
