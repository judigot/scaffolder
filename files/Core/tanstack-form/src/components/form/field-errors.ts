export function fieldErrorMessage(errors: ReadonlyArray<unknown>): string {
  return errors
    .map((error) => (typeof error === 'string' ? error : String(error)))
    .join(', ');
}
