import type { JSX, ReactNode } from 'react';

interface IFormShell {
  AppForm: (props: { children?: ReactNode }) => JSX.Element;
  handleSubmit: () => unknown;
}

export function Form({
  form,
  children,
  className,
}: {
  form: IFormShell;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  const AppForm = form.AppForm;

  return (
    <AppForm>
      <form
        className={className ?? 'space-y-4'}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {children}
      </form>
    </AppForm>
  );
}
