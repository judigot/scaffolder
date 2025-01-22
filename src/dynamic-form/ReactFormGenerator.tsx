import { JSONFormStructure } from './DynamicFormStructure.ts';
import { useState } from 'react';
import './DynamicForm.css';

const generateFieldComponent = (field: unknown): string => {
  // Define the expected structure of the field
  const fieldObj: {
    key: string;
    type: string;
    widget: string;
    label: string;
    placeholder?: string;
    pattern?: string;
    enum?: string[];
  } = field as {
    key: string;
    type: string;
    widget: string;
    label: string;
    placeholder?: string;
    pattern?: string;
    enum?: string[];
  };

  switch (fieldObj.widget) {
    case 'text':
    case 'email':
    case 'tel':
      return `
        <div className="form-field">
          <label htmlFor="${fieldObj.key}">${fieldObj.label}</label>
          <input
            type="${fieldObj.widget}"
            id="${fieldObj.key}"
            name="${fieldObj.key}"
            placeholder="${fieldObj.placeholder ?? ''}"
            ${fieldObj.pattern ? `pattern="${fieldObj.pattern}"` : ''}
          />
        </div>`;

    case 'select':
      return `
        <div className="form-field">
          <label htmlFor="${fieldObj.key}">${fieldObj.label}</label>
          <select id="${fieldObj.key}" name="${fieldObj.key}">
            <option value="">Select ${fieldObj.label}</option>
            ${(fieldObj.enum ?? [])
              .map((option) => `<option value="${option}">${option}</option>`)
              .join('\n')}
          </select>
        </div>`;

    default:
      return `
        <div className="form-field">
          <label htmlFor="${fieldObj.key}">${fieldObj.label}</label>
          <input type="text" id="${fieldObj.key}" name="${fieldObj.key}" />
        </div>`;
  }
};

export function DynamicForm(structure: typeof JSONFormStructure): JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<{ [key: string]: unknown }>({});

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      const response = await fetch(`${structure.buttons.submit.action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Form submission failed');
      }
      // Handle success
    } catch (error) {
      // Handle error
      console.error('Error submitting form:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="dynamic-form">
      <h1>${structure.title}</h1>
      <p>${structure.description}</p>

      {/* Step Navigation */}
      <div className="step-navigation">
        {${JSON.stringify(structure.steps)}.map((step, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentStep(index)}
            className={\`step-button \${currentStep === index ? 'active' : ''}\`}
          >
            {step.title}
          </button>
        ))}
      </div>

      {/* Form Steps */}
      ${structure.steps
        .map(
          (step, stepIndex) => `
      {currentStep === ${stepIndex} && (
        <div className="form-step">
          <h2>${step.title}</h2>
          <p>${step.description}</p>
          ${step.sections
            .map(
              (section) => `
          <div className="form-section">
            <h3>${section.title}</h3>
            <p>${section.description}</p>
            <div className="fields-grid" style={{ gridTemplateColumns: \`repeat(\${${
              section.columns ?? 1
            }}, 1fr)\` }}>
              ${section.fields.map((field) => generateFieldComponent(field)).join('\n')}
            </div>
          </div>`,
            )
            .join('\n<hr />\n')}
        </div>
      )}`,
        )
        .join('\n')}

      {/* Navigation Buttons */}
      <div className="form-navigation">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="prev-button"
          >
            ${structure.buttons.previous.label}
          </button>
        )}
        {currentStep < ${structure.steps.length - 1} ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => prev + 1)}
            className="next-button"
          >
            ${structure.buttons.next.label}
          </button>
        ) : (
          <button type="submit" className="submit-button">
            ${structure.buttons.submit.label}
          </button>
        )}
      </div>
    </form>
  );
}
