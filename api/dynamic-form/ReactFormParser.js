import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
export function FormParser({ structure }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false); // Track form submission
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const validateRequiredFields = (section) => {
    if (!section.required) {
      return true;
    } // Handle case where required is undefined
    return section.required.every((fieldKey) => {
      const fieldValue = formData[fieldKey];
      return (
        fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
      );
    });
  };
  const renderField = (field) => {
    const id = field.key;
    const name = field.key;
    const placeholder = field.placeholder;
    const ariaLabel = field.label;
    const fieldValue = formData[field.key];
    const value =
      fieldValue === null || fieldValue === undefined
        ? ''
        : typeof fieldValue === 'string' || typeof fieldValue === 'number'
          ? String(fieldValue)
          : '';
    switch (field.widget) {
      case 'text':
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsx('input', {
              type: 'text',
              id: id,
              name: name,
              placeholder: placeholder,
              'aria-label': ariaLabel,
              value: value,
              onChange: handleInputChange,
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
              required: field.required,
            }),
          ],
        });
      case 'email':
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsx('input', {
              type: 'email',
              id: id,
              name: name,
              placeholder: placeholder,
              'aria-label': ariaLabel,
              value: value,
              onChange: handleInputChange,
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
              required: field.required,
            }),
          ],
        });
      case 'password':
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsx('input', {
              type: 'password',
              id: id,
              name: name,
              placeholder: placeholder,
              'aria-label': ariaLabel,
              value: value,
              onChange: handleInputChange,
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
              required: field.required,
            }),
          ],
        });
      case 'number':
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsx('input', {
              type: 'number',
              id: id,
              name: name,
              placeholder: placeholder,
              'aria-label': ariaLabel,
              value: value,
              onChange: handleInputChange,
              min: field.min,
              max: field.max,
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
              required: field.required,
            }),
          ],
        });
      case 'select':
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsxs('select', {
              id: id,
              name: name,
              'aria-label': ariaLabel,
              value: value,
              onChange: handleInputChange,
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
              required: field.required,
              children: [
                _jsxs('option', {
                  value: '',
                  children: ['Select ', field.label],
                }),
                field.enum?.map((option) =>
                  _jsx('option', { value: option, children: option }, option),
                ),
              ],
            }),
          ],
        });
      case 'radio':
        return _jsx('div', {
          className: 'form-field mb-4',
          children: _jsxs('fieldset', {
            children: [
              _jsx('legend', {
                className: 'block text-sm font-medium text-gray-700',
                children: field.label,
              }),
              field.enum?.map((option) =>
                _jsxs(
                  'div',
                  {
                    className: 'flex items-center mb-2',
                    children: [
                      _jsx('input', {
                        type: 'radio',
                        id: `${field.key}-${option}`,
                        name: field.key,
                        value: option,
                        checked: formData[field.key] === option,
                        onChange: handleInputChange,
                        className: 'mr-2',
                        required: field.required,
                      }),
                      _jsx('label', {
                        htmlFor: `${field.key}-${option}`,
                        className: 'text-sm text-gray-600',
                        children: option,
                      }),
                    ],
                  },
                  option,
                ),
              ),
            ],
          }),
        });
      case 'file':
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsx('input', {
              type: 'file',
              id: id,
              name: name,
              placeholder: placeholder,
              'aria-label': ariaLabel,
              accept: field.acceptedFormats
                ?.map((format) => `.${format}`)
                .join(','),
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
            }),
            _jsxs('small', {
              className: 'text-gray-500',
              children: [
                'Max file size: ',
                field.maxFileSize,
                'MB',
                field.acceptedFormats &&
                  ` | Accepted formats: ${field.acceptedFormats.join(', ')}`,
              ],
            }),
          ],
        });
      default:
        return _jsxs('div', {
          className: 'form-field mb-4',
          children: [
            _jsx('label', {
              htmlFor: id,
              className: 'block text-sm font-medium text-gray-700',
              children: field.label,
            }),
            _jsx('input', {
              type: 'text',
              id: id,
              name: name,
              placeholder: placeholder,
              'aria-label': ariaLabel,
              value: value,
              onChange: handleInputChange,
              className:
                'mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500',
              required: field.required,
            }),
          ],
        });
    }
  };
  const renderSection = (section) => {
    const allFieldsFilled = validateRequiredFields(section);
    return _jsxs('div', {
      className: 'form-section mb-6',
      children: [
        _jsx('h3', {
          className: 'text-lg font-semibold text-gray-800',
          children: section.title,
        }),
        formSubmitted &&
          !allFieldsFilled &&
          _jsx('p', {
            className: 'text-red-600',
            children: 'Please fill in all required fields.',
          }),
        _jsx('p', {
          className: 'text-gray-600',
          children: section.description,
        }),
        _jsx('div', {
          className: 'grid gap-4',
          style: {
            gridTemplateColumns: `repeat(${String(section.columns) !== '' ? String(section.columns) : String(1)}, 1fr)`,
          },
          children: section.fields.map((field) =>
            _jsx('div', { children: renderField(field) }, field.key),
          ),
        }),
        (section.repeatable ?? false) &&
          _jsxs('button', {
            type: 'button',
            className:
              'mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
            onClick: () => {
              /* Add repeatable section logic */
            },
            children: ['Add Another ', section.title],
          }),
      ],
    });
  };
  const renderCurrentStep = () => {
    const step = structure.steps[currentStep];
    return _jsxs('form', {
      id: 'reactFormParserForm',
      name: 'reactFormParserForm',
      className: 'form-step mb-8 p-4 md:p-6 lg:p-8',
      onSubmit: (e) => {
        e.preventDefault(); // Prevent default form submission
        setFormSubmitted(true); // Set form submitted state
        const form = e.currentTarget; // Get the form element
        const allFieldsFilled = validateRequiredFields(
          step.sections[currentStep],
        ); // Use the correct section
        if (allFieldsFilled) {
          // Use console.log instead of alert for better type safety
          // eslint-disable-next-line no-console
          console.log(JSON.stringify(formData, null, 2));
        } else {
          // Set custom validity for required fields
          step.sections[currentStep].fields.forEach((field) => {
            const element = form.elements.namedItem(field.key);
            if (element instanceof HTMLInputElement) {
              if (field.required && formData[field.key] === undefined) {
                element.setCustomValidity('This field is required.');
              } else {
                element.setCustomValidity('');
              }
            }
          });
          form.reportValidity(); // Trigger validation UI
        }
      },
      children: [
        _jsx('h2', {
          className: 'text-2xl font-bold text-gray-800',
          children: step.title,
        }),
        _jsx('p', { className: 'text-gray-600', children: step.description }),
        step.sections.map((section, index) =>
          _jsxs(
            'div',
            {
              children: [
                renderSection(section),
                index < step.sections.length - 1 &&
                  _jsx('hr', { className: 'my-4' }),
              ],
            },
            index,
          ),
        ),
        _jsxs('div', {
          className: 'form-navigation flex justify-between mt-6',
          children: [
            currentStep > 0 &&
              _jsx('button', {
                type: 'button',
                onClick: () => {
                  previousStep();
                },
                className:
                  'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
                children: structure.buttons.previous.label,
              }),
            currentStep < structure.steps.length - 1
              ? _jsx('button', {
                  type: 'button',
                  onClick: () => {
                    nextStep();
                  },
                  className:
                    'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
                  children: structure.buttons.next.label,
                })
              : _jsx('button', {
                  type: 'submit', // Changed to semantic submit button
                  className:
                    'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                  children: structure.buttons.submit.label,
                }),
          ],
        }),
      ],
    });
  };
  const nextStep = () => {
    if (currentStep < structure.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };
  return _jsx('div', {
    className: 'container mx-auto p-4',
    children: renderCurrentStep(),
  });
}
