import { ReactElement, useState } from 'react';
import { JSONFormStructure } from './DynamicFormStructure.ts';

/* Prompt
Don't use prop spreading.
 */

interface IFormField {
  key: string;
  type: string;
  widget: string;
  label: string;
  required: boolean;
  placeholder?: string;
  pattern?: string;
  errorMessages?: Record<string, string>;
  enum?: string[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  computed?: {
    dependsOn: string[];
    formula: string;
  };
  acceptedFormats?: string[];
  maxFileSize?: number;
  visibleIf?: {
    field: string;
    operator: string;
    value: unknown;
  };
}

interface IFormSection {
  title: string;
  description: string;
  columns?: number;
  required?: string[];
  fields: IFormField[];
  repeatable?: boolean;
  maxRepeat?: number;
}

export function FormParser({
  structure,
}: {
  structure: typeof JSONFormStructure;
}): ReactElement {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formSubmitted, setFormSubmitted] = useState(false); // Track form submission

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void => {
    const { name, value, type } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.checked;

    setFormData((prevData: Record<string, unknown>) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateRequiredFields = (section: IFormSection): boolean => {
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

  const renderField = (field: IFormField): ReactElement => {
    const id = field.key;
    const name = field.key;
    const placeholder = field.placeholder;
    const ariaLabel = field.label;
    const value = formData[field.key] ?? ''; // Set value from formData

    switch (field.widget) {
      case 'text':
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <input
              type="text"
              id={id}
              name={name}
              placeholder={placeholder}
              aria-label={ariaLabel}
              value={value}
              onChange={handleInputChange} // Handle change
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
              required={field.required} // Add required attribute
            />
          </div>
        );

      case 'email':
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <input
              type="email"
              id={id}
              name={name}
              placeholder={placeholder}
              aria-label={ariaLabel}
              value={value}
              onChange={handleInputChange} // Handle change
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
              required={field.required} // Add required attribute
            />
          </div>
        );

      case 'password':
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <input
              type="password"
              id={id}
              name={name}
              placeholder={placeholder}
              aria-label={ariaLabel}
              value={value}
              onChange={handleInputChange} // Handle change
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
              required={field.required} // Add required attribute
            />
          </div>
        );

      case 'number':
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <input
              type="number"
              id={id}
              name={name}
              placeholder={placeholder}
              aria-label={ariaLabel}
              value={value}
              onChange={handleInputChange} // Handle change
              min={field.min}
              max={field.max}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
              required={field.required} // Add required attribute
            />
          </div>
        );

      case 'select':
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <select
              id={id}
              name={name}
              aria-label={ariaLabel}
              value={value}
              onChange={handleInputChange} // Handle change
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
              required={field.required} // Add required attribute
            >
              <option value="">Select {field.label}</option>
              {field.enum?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'radio':
        return (
          <div className="form-field mb-4">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">
                {field.label}
              </legend>
              {field.enum?.map((option) => (
                <div key={option} className="flex items-center mb-2">
                  <input
                    type="radio"
                    id={`${field.key}-${option}`}
                    name={field.key}
                    value={option}
                    checked={formData[field.key] === option} // Set checked state
                    onChange={handleInputChange} // Handle change
                    className="mr-2"
                    required={field.required} // Add required attribute
                  />
                  <label
                    htmlFor={`${field.key}-${option}`}
                    className="text-sm text-gray-600"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </fieldset>
          </div>
        );

      case 'file':
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <input
              type="file"
              id={id}
              name={name}
              placeholder={placeholder}
              aria-label={ariaLabel}
              accept={field.acceptedFormats
                ?.map((format) => `.${format}`)
                .join(',')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
            />
            <small className="text-gray-500">
              Max file size: {field.maxFileSize}MB
              {field.acceptedFormats &&
                ` | Accepted formats: ${field.acceptedFormats.join(', ')}`}
            </small>
          </div>
        );

      default:
        return (
          <div className="form-field mb-4">
            <label
              htmlFor={id}
              className="block text-sm font-medium text-gray-700"
            >
              {field.label}
            </label>
            <input
              type="text"
              id={id}
              name={name}
              placeholder={placeholder}
              aria-label={ariaLabel}
              value={value}
              onChange={handleInputChange} // Handle change
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-green-500 focus:border-green-500"
              required={field.required} // Add required attribute
            />
          </div>
        );
    }
  };

  const renderSection = (section: IFormSection): ReactElement => {
    const allFieldsFilled = validateRequiredFields(section);
    return (
      <div className="form-section mb-6">
        <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
        {formSubmitted && !allFieldsFilled && (
          <p className="text-red-600">Please fill in all required fields.</p>
        )}
        <p className="text-gray-600">{section.description}</p>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${String(section.columns) !== '' ? String(section.columns) : String(1)}, 1fr)`,
          }}
        >
          {section.fields.map((field) => (
            <div key={field.key}>{renderField(field)}</div>
          ))}
        </div>
        {(section.repeatable ?? false) && (
          <button
            type="button"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            onClick={() => {
              /* Add repeatable section logic */
            }}
          >
            Add Another {section.title}
          </button>
        )}
      </div>
    );
  };

  const renderCurrentStep = (): ReactElement => {
    const step = structure.steps[currentStep];

    return (
      <form
        className="form-step mb-8 p-4 md:p-6 lg:p-8"
        onSubmit={(e) => {
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
        }}
      >
        <h2 className="text-2xl font-bold text-gray-800">{step.title}</h2>
        <p className="text-gray-600">{step.description}</p>
        {step.sections.map((section, index) => (
          <div key={index}>
            {renderSection(section)}
            {index < step.sections.length - 1 && <hr className="my-4" />}
          </div>
        ))}
        <div className="form-navigation flex justify-between mt-6">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => {
                previousStep();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              {structure.buttons.previous.label}
            </button>
          )}
          {currentStep < structure.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                nextStep();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {structure.buttons.next.label}
            </button>
          ) : (
            <button
              type="submit" // Changed to semantic submit button
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {structure.buttons.submit.label}
            </button>
          )}
        </div>
      </form>
    );
  };

  const nextStep = (): void => {
    if (currentStep < structure.steps.length - 1) {
      setCurrentStep((prev: number) => prev + 1);
    }
  };

  const previousStep = (): void => {
    if (currentStep > 0) {
      setCurrentStep((prev: number) => prev - 1);
    }
  };

  return <div className="container mx-auto p-4">{renderCurrentStep()}</div>;
}
