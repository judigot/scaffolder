import type { JSX } from 'react';
import { fieldErrorMessage } from './field-errors';
import { useFieldContext } from './form-context';

export function TextField({
  label,
  type = 'text',
}: {
  label: string;
  type?: 'text' | 'email' | 'password' | 'url' | 'datetime-local';
}): JSX.Element {
  const field = useFieldContext<string>();
  const errors = fieldErrorMessage(field.state.meta.errors);

  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value);
        }}
        className="w-full rounded border px-2 py-1"
        aria-invalid={errors !== ''}
      />
      {errors !== '' ? (
        <em className="text-sm text-red-600" role="alert">
          {errors}
        </em>
      ) : null}
    </label>
  );
}
