import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAuthDiagnostics } from '@/lib/auth/authDiagnostics.ts';
import {
  canAttemptLoginRedirect,
  consumeDraft,
  getCurrentReturnTo,
  getSavedReturnTo,
  MAX_LOGIN_ATTEMPTS,
  recordLoginRedirect,
  registerDraftProvider,
  sanitizeReturnTo,
  saveReturnContext,
} from '@/lib/auth/returnContext.ts';
import { resetAuthState } from './testUtils.ts';

describe('returnContext', () => {
  beforeEach(() => {
    resetAuthState();
    window.history.replaceState({}, '', '/scaffolder/?tab=infra#workspace-a');
  });
  afterEach(() => {
    resetAuthState();
    window.history.replaceState({}, '', '/');
  });

  it('preserves the current page and safe drafts across re-authentication', () => {
    const unregister = registerDraftProvider('infra:new-workspace', () => ({
      newWorkspace: 'staging',
      awsRegion: 'ap-southeast-1',
    }));
    registerDraftProvider('empty', () => null);

    const context = saveReturnContext();
    unregister();

    expect(context.returnTo).toBe('/scaffolder/?tab=infra#workspace-a');
    expect(getSavedReturnTo()).toBe('/scaffolder/?tab=infra#workspace-a');
    expect(consumeDraft('infra:new-workspace')).toEqual({
      newWorkspace: 'staging',
      awsRegion: 'ap-southeast-1',
    });
    // Drafts are consumed exactly once.
    expect(consumeDraft('infra:new-workspace')).toBeNull();
    expect(consumeDraft('empty')).toBeNull();
  });

  it('strips Auth0 callback parameters from the return target', () => {
    window.history.replaceState({}, '', '/app?code=abc&state=xyz&tab=infra');
    expect(getCurrentReturnTo()).toBe('/app?tab=infra');
  });

  it('only accepts same-origin relative return targets', () => {
    expect(sanitizeReturnTo('/scaffolder/')).toBe('/scaffolder/');
    expect(sanitizeReturnTo('https://evil.example')).toBeNull();
    expect(sanitizeReturnTo('//evil.example')).toBeNull();
    expect(sanitizeReturnTo('/\\evil')).toBeNull();
    expect(sanitizeReturnTo(42)).toBeNull();
  });

  it('prevents infinite login redirect loops', () => {
    for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt += 1) {
      expect(recordLoginRedirect('test')).toBe(true);
    }
    expect(canAttemptLoginRedirect()).toBe(false);
    expect(recordLoginRedirect('test')).toBe(false);
    expect(getAuthDiagnostics().map((d) => d.event)).toContain(
      'login.loop-prevented',
    );
  });
});
