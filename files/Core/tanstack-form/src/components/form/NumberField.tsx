import type { JSX } from 'react';
import { fieldErrorMessage } from './field-errors';
import { useFieldContext } from './form-context';

export function NumberField({ label }: { label: string }): JSX.Element {
  const field = useFieldContext<number>();
  const errors = fieldErrorMessage(field.state.meta.errors);

  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        id={field.name}
        name={field.name}
        type="number"
        value={Number.isFinite(field.state.value) ? field.state.value : ''}
        onBlur={field.handleBlur}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          field.handleChange(Number.isNaN(next) ? 0 : next);
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
