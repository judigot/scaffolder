import type { JSX } from 'react';
import { fieldErrorMessage } from './field-errors';
import { useFieldContext } from './form-context';

export function CheckboxField({ label }: { label: string }): JSX.Element {
  const field = useFieldContext<boolean>();
  const errors = fieldErrorMessage(field.state.meta.errors);

  return (
    <label className="flex items-center gap-2">
      <input
        id={field.name}
        name={field.name}
        type="checkbox"
        checked={field.state.value === true}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.checked);
        }}
        aria-invalid={errors !== ''}
      />
      <span className="text-sm font-medium">{label}</span>
      {errors !== '' ? (
        <em className="text-sm text-red-600" role="alert">
          {errors}
        </em>
      ) : null}
    </label>
  );
}
