import { focusManager, onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAppQueryClient,
  installAuthAwareFocusManager,
  installConnectivityTracking,
  shouldRetryQuery,
} from '@/lib/api/queryClient.ts';
import { ApiError, SessionExpiredError } from '@/lib/auth/authErrors.ts';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';
import { resetAuthState } from './testUtils.ts';

const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('query client resilience', () => {
  beforeEach(resetAuthState);
  afterEach(() => {
    setVisibility('visible');
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
    resetAuthState();
  });

  it('never retries auth or permission failures, retries transient ones a bounded number of times', () => {
    expect(shouldRetryQuery(0, new SessionExpiredError())).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ kind: 'unauthorized' }))).toBe(
      false,
    );
    expect(shouldRetryQuery(0, new ApiError({ kind: 'forbidden' }))).toBe(
      false,
    );
    expect(shouldRetryQuery(0, new ApiError({ kind: 'client' }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ kind: 'offline' }))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError({ kind: 'server' }))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError({ kind: 'network' }))).toBe(true);
    expect(shouldRetryQuery(2, new ApiError({ kind: 'network' }))).toBe(false);
  });

  it('never queues or retries mutations', () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions().mutations;
    expect(defaults?.retry).toBe(false);
    expect(defaults?.networkMode).toBe('always');
  });

  it('revalidates the session before refetching when the tab becomes visible', async () => {
    const order: string[] = [];
    let resolveRevalidate: () => void = () => undefined;
    const revalidate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          order.push('revalidate:start');
          resolveRevalidate = () => {
            order.push('revalidate:done');
            resolve();
          };
        }),
    );
    installAuthAwareFocusManager(revalidate);
    const unsubscribe = focusManager.subscribe((focused) => {
      order.push(`focus:${String(focused)}`);
    });

    setVisibility('hidden');
    expect(focusManager.isFocused()).toBe(false);

    setVisibility('visible');
    expect(revalidate).toHaveBeenCalledTimes(1);
    // Queries must not refetch until the session has been revalidated.
    expect(order).toEqual(['focus:false', 'revalidate:start']);

    resolveRevalidate();
    await vi.waitFor(() => {
      expect(order).toEqual([
        'focus:false',
        'revalidate:start',
        'revalidate:done',
        'focus:true',
      ]);
    });
    unsubscribe();
  });

  it('tracks offline/online transitions for the connectivity indicator', () => {
    const stop = installConnectivityTracking();
    window.dispatchEvent(new Event('offline'));
    expect(useSessionStore.getState().isOnline).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(useSessionStore.getState().isOnline).toBe(true);
    stop();
  });
});
