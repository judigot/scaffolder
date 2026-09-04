import { createFormHook } from '@tanstack/react-form';
import { CheckboxField } from './CheckboxField';
import { fieldContext, formContext } from './form-context';
import { NumberField } from './NumberField';
import { SubmitButton } from './SubmitButton';
import { TextField } from './TextField';

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    NumberField,
    CheckboxField,
  },
  formComponents: {
    SubmitButton,
  },
});
