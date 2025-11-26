import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
const generateFieldComponent = (field) => {
  const fieldObj = field;
  switch (fieldObj.widget) {
    case 'text':
    case 'email':
    case 'tel':
      return _jsxs('div', {
        className: 'form-field',
        children: [
          _jsx('label', { htmlFor: fieldObj.key, children: fieldObj.label }),
          _jsx('input', {
            type: fieldObj.widget,
            id: fieldObj.key,
            name: fieldObj.key,
            placeholder: fieldObj.placeholder ?? '',
            pattern: fieldObj.pattern,
          }),
        ],
      });
    case 'select':
      return _jsxs('div', {
        className: 'form-field',
        children: [
          _jsx('label', { htmlFor: fieldObj.key, children: fieldObj.label }),
          _jsxs('select', {
            id: fieldObj.key,
            name: fieldObj.key,
            children: [
              _jsxs('option', {
                value: '',
                children: ['Select ', fieldObj.label],
              }),
              (fieldObj.enum ?? []).map((option) =>
                _jsx('option', { value: option, children: option }, option),
              ),
            ],
          }),
        ],
      });
    default:
      return _jsxs('div', {
        className: 'form-field',
        children: [
          _jsx('label', { htmlFor: fieldObj.key, children: fieldObj.label }),
          _jsx('input', { type: 'text', id: fieldObj.key, name: fieldObj.key }),
        ],
      });
  }
};
export function DynamicForm(structure) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, _setFormData] = useState({});
  const handleSubmit = (e) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    /*prettier-ignore*/ (($ = formData) => { console.log(["string", "number"].includes(typeof $) ? $ : JSON.stringify($, null, 4)); })();
    // try {
    //   const response = await fetch(structure.buttons.submit.action, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(formData),
    //   });
    //   if (!response.ok) {
    //     throw new Error('Form submission failed');
    //   }
    //   // Handle success
    // } catch (error) {
    //   // Handle error
    //   console.error('Error submitting form:', error);
    // }
  };
  return _jsxs('form', {
    id: 'reactFormGeneratorForm',
    name: 'reactFormGeneratorForm',
    onSubmit: handleSubmit,
    className: 'dynamic-form',
    children: [
      _jsx('h1', { children: structure.title }),
      _jsx('p', { children: structure.description }),
      _jsx('div', {
        className: 'step-navigation',
        children: structure.steps.map((step, index) =>
          _jsx(
            'button',
            {
              type: 'button',
              onClick: () => {
                setCurrentStep(index);
              },
              className: `step-button ${currentStep === index ? 'active' : ''}`,
              children: step.title,
            },
            index,
          ),
        ),
      }),
      structure.steps.map(
        (step, stepIndex) =>
          currentStep === stepIndex &&
          _jsxs(
            'div',
            {
              className: 'form-step',
              children: [
                _jsx('h2', { children: step.title }),
                _jsx('p', { children: step.description }),
                step.sections.map((section, sectionIndex) =>
                  _jsxs(
                    'div',
                    {
                      className: 'form-section',
                      children: [
                        _jsx('h3', { children: section.title }),
                        _jsx('p', { children: section.description }),
                        _jsx('div', {
                          className: 'fields-grid',
                          style: {
                            gridTemplateColumns: `repeat(${String(section.columns)}, 1fr)`,
                          },
                          children: section.fields.map((field) => {
                            return generateFieldComponent(field);
                          }),
                        }),
                      ],
                    },
                    sectionIndex,
                  ),
                ),
              ],
            },
            stepIndex,
          ),
      ),
      _jsxs('div', {
        className: 'form-navigation',
        children: [
          currentStep > 0 &&
            _jsx('button', {
              type: 'button',
              onClick: () => {
                setCurrentStep((prev) => prev - 1);
              },
              className: 'prev-button',
              children: structure.buttons.previous.label,
            }),
          currentStep < structure.steps.length - 1
            ? _jsx('button', {
                type: 'button',
                onClick: () => {
                  setCurrentStep((prev) => prev + 1);
                },
                className: 'next-button',
                children: structure.buttons.next.label,
              })
            : _jsx('button', {
                type: 'submit',
                className: 'submit-button',
                children: structure.buttons.submit.label,
              }),
        ],
      }),
    ],
  });
}
