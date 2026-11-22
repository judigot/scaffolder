/**
 * GitHub-style workspace termination gate: trimmed input must equal the name.
 * Comparison is case-sensitive; only leading/trailing whitespace is ignored.
 */
export function matchesWorkspaceNameConfirmation(
  input: string,
  workspaceName: string,
): boolean {
  return input.trim() === workspaceName;
}
