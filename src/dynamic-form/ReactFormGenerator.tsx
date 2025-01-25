import { JSONFormStructure } from './DynamicFormStructure.ts';
import { useState } from 'react';

interface IField {
  key: string;
  type: string;
  widget: string;
  label: string;
  placeholder?: string;
  pattern?: string;
  enum?: string[];
}

const generateFieldComponent = (field: IField) => {
  const fieldObj = field;

  switch (fieldObj.widget) {
    case 'text':
    case 'email':
    case 'tel':
      return (
        <div className="form-field">
          <label htmlFor={fieldObj.key}>{fieldObj.label}</label>
          <input
            type={fieldObj.widget}
            id={fieldObj.key}
            name={fieldObj.key}
            placeholder={fieldObj.placeholder ?? ''}
            pattern={fieldObj.pattern}
          />
        </div>
      );

    case 'select':
      return (
        <div className="form-field">
          <label htmlFor={fieldObj.key}>{fieldObj.label}</label>
          <select id={fieldObj.key} name={fieldObj.key}>
            <option value="">Select {fieldObj.label}</option>
            {(fieldObj.enum ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );

    default:
      return (
        <div className="form-field">
          <label htmlFor={fieldObj.key}>{fieldObj.label}</label>
          <input type="text" id={fieldObj.key} name={fieldObj.key} />
        </div>
      );
  }
};

export function DynamicForm(structure: typeof JSONFormStructure) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    /*prettier-ignore*/ (($= formData)=>{console.log(["string","number"].includes(typeof $)?$:JSON.stringify($,null,4));})();
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

  const _handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const { name, value } = e.target;
    setFormData((prev: Record<string, unknown>) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form
      id="reactFormGeneratorForm"
      name="reactFormGeneratorForm"
      onSubmit={handleSubmit}
      className="dynamic-form"
    >
      <h1>{structure.title}</h1>
      <p>{structure.description}</p>

      {/* Step Navigation */}
      <div className="step-navigation">
        {structure.steps.map((step, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              setCurrentStep(index);
            }}
            className={`step-button ${currentStep === index ? 'active' : ''}`}
          >
            {step.title}
          </button>
        ))}
      </div>

      {/* Form Steps */}
      {structure.steps.map(
        (step, stepIndex) =>
          currentStep === stepIndex && (
            <div key={stepIndex} className="form-step">
              <h2>{step.title}</h2>
              <p>{step.description}</p>
              {step.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="form-section">
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                  <div
                    className="fields-grid"
                    style={{
                      gridTemplateColumns: `repeat(${String(section.columns)}, 1fr)`,
                    }}
                  >
                    {section.fields.map((field) => {
                      return generateFieldComponent(field);
                    })}
                  </div>
                </div>
              ))}
            </div>
          ),
      )}

      {/* Navigation Buttons */}
      <div className="form-navigation">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => {
              setCurrentStep((prev: number) => prev - 1);
            }}
            className="prev-button"
          >
            {structure.buttons.previous.label}
          </button>
        )}
        {currentStep < structure.steps.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              setCurrentStep((prev: number) => prev + 1);
            }}
            className="next-button"
          >
            {structure.buttons.next.label}
          </button>
        ) : (
          <button type="submit" className="submit-button">
            {structure.buttons.submit.label}
          </button>
        )}
      </div>
    </form>
  );
}
