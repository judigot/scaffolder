import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Better Auth session helper', () => {
  const sessionSource = fs.readFileSync(
    path.resolve(
      __dirname,
      '../../../files/Core/auth-services/api/auth/session.ts',
    ),
    'utf-8',
  );

  it('looks up sessions from the adapter instead of signed getSession cookies', () => {
    expect(sessionSource).toContain('internalAdapter.findSession');
    expect(sessionSource).toContain('sessionTokenFromCookie');
    expect(sessionSource).not.toMatch(/auth\.api\.getSession/);
  });
});
