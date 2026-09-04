# TanStack Form core

Reusable `createFormHook` wrappers for CRUD create/edit pages.

This core is **forms only**. It does not replace login/register (those live in
`/Core/auth-react`).

## Layout

```text
src/components/form/   Form, TextField, NumberField, CheckboxField, SubmitButton
```

## Composition

```yaml
$USE_CORE:
  - /Core/vite-react
  - /Core/tanstack-form
```

Generated create pages import `Form` and `useAppForm` from `@/components/form`.
