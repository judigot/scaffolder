import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  classifyHttpStatus,
  SessionExpiredError,
  toUserMessage,
} from '@/lib/auth/authErrors.ts';
import {
  clearAuthDiagnostics,
  recordAuthDiagnostic,
  sanitizeDiagnosticDetails,
  setAuthDiagnosticSink,
} from '@/lib/auth/authDiagnostics.ts';

describe('auth errors and diagnostics', () => {
  afterEach(() => {
    setAuthDiagnosticSink(null);
    clearAuthDiagnostics();
  });

  it('classifies HTTP statuses', () => {
    expect(classifyHttpStatus(401)).toBe('unauthorized');
    expect(classifyHttpStatus(403)).toBe('forbidden');
    expect(classifyHttpStatus(404)).toBe('not-found');
    expect(classifyHttpStatus(422)).toBe('client');
    expect(classifyHttpStatus(503)).toBe('server');
  });

  it('produces friendly messages instead of raw exceptions', () => {
    expect(toUserMessage(new SessionExpiredError())).toMatch(/Sign in again/);
    expect(toUserMessage(new TypeError('Failed to fetch'))).toMatch(
      /could not reach/i,
    );
    const zodLike = new Error('[{"code":"invalid_type"}]');
    zodLike.name = 'ZodError';
    expect(toUserMessage(zodLike)).toBe(
      'The server returned an unexpected response.',
    );
    expect(toUserMessage('x'.repeat(10), 'Fallback')).toBe('Fallback');
    expect(toUserMessage(new Error('a'.repeat(500)), 'Fallback')).toBe(
      'Fallback',
    );
    expect(new ApiError({ kind: 'forbidden' }).isTransient).toBe(false);
  });

  it('redacts credentials from diagnostics', () => {
    const jwt =
      'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhdXRoMHwxMjMifQ.c2lnbmF0dXJlLXZhbHVl';
    const details = sanitizeDiagnosticDetails({
      accessToken: 'abc',
      authorization: 'Bearer abc',
      email: 'jude@example.com',
      endpoint: '/api/terraform/run',
      note: jwt,
      header: 'Bearer secret-value',
      errorCode: 'login_required',
    });
    expect(details).toEqual({
      accessToken: '[redacted]',
      authorization: '[redacted]',
      email: '[redacted]',
      endpoint: '/api/terraform/run',
      note: '[redacted]',
      header: '[redacted]',
      errorCode: 'login_required',
    });
  });

  it('forwards structured records to the configured sink', () => {
    const sink = vi.fn();
    setAuthDiagnosticSink(sink);
    recordAuthDiagnostic('session.expired', { errorCode: 'login_required' });
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'auth',
        event: 'session.expired',
        details: { errorCode: 'login_required' },
      }),
    );
  });
});
