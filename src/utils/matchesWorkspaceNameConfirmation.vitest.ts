import { describe, expect, it } from 'vitest';
import { matchesWorkspaceNameConfirmation } from '@/utils/matchesWorkspaceNameConfirmation.ts';

describe('matchesWorkspaceNameConfirmation', () => {
  it('accepts an exact match', () => {
    expect(
      matchesWorkspaceNameConfirmation('my-workspace', 'my-workspace'),
    ).toBe(true);
  });

  it('trims whitespace on the typed input only', () => {
    expect(
      matchesWorkspaceNameConfirmation('  my-workspace  ', 'my-workspace'),
    ).toBe(true);
    expect(
      matchesWorkspaceNameConfirmation('my-workspace', '  my-workspace  '),
    ).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(
      matchesWorkspaceNameConfirmation('My-Workspace', 'my-workspace'),
    ).toBe(false);
  });

  it('rejects partial and empty input', () => {
    expect(matchesWorkspaceNameConfirmation('my-work', 'my-workspace')).toBe(
      false,
    );
    expect(matchesWorkspaceNameConfirmation('', 'my-workspace')).toBe(false);
    expect(matchesWorkspaceNameConfirmation('   ', 'my-workspace')).toBe(false);
  });
});
