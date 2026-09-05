import type { JSX } from 'react';
import { useFormContext } from './form-context';

export function SubmitButton({ label }: { label: string }): JSX.Element {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting === true ? 'Saving…' : label}
        </button>
      )}
    </form.Subscribe>
  );
}
