import { create } from 'zustand';

/**
 * Session lifecycle for the current browser tab.
 *
 * - `unknown`: Auth0 has not resolved yet.
 * - `active`: the last token request succeeded.
 * - `refreshing`: a silent renewal is in flight.
 * - `expired`: silent renewal failed with an interactive-login error. All
 *   protected requests are blocked until the user signs in again.
 */
export type SessionStatus = 'unknown' | 'active' | 'refreshing' | 'expired';

export interface ISessionState {
  status: SessionStatus;
  /** Auth0 error code that caused expiry (never a token). */
  expiredReason: string | null;
  lastValidatedAt: number | null;
  /** Set when a request failed for auth/transient reasons and awaits recovery. */
  recoveryPending: boolean;
  /** Timestamp of the last recovery after a failure (drives query refetch). */
  recoveredAt: number | null;
  isOnline: boolean;
  markRecoveryPending: () => void;
  setStatus: (status: SessionStatus) => void;
  markActive: () => void;
  markExpired: (reason: string) => void;
  setOnline: (isOnline: boolean) => void;
  reset: () => void;
}

const initialOnline = (): boolean =>
  typeof navigator === 'undefined' ? true : navigator.onLine;

export const useSessionStore = create<ISessionState>((set) => ({
  status: 'unknown',
  expiredReason: null,
  lastValidatedAt: null,
  recoveryPending: false,
  recoveredAt: null,
  isOnline: initialOnline(),
  markRecoveryPending: () => {
    set({ recoveryPending: true });
  },
  setStatus: (status) => {
    set({ status });
  },
  markActive: () => {
    set((state) => {
      const now = Date.now();
      return {
        status: 'active',
        expiredReason: null,
        lastValidatedAt: now,
        recoveryPending: false,
        recoveredAt: state.recoveryPending ? now : state.recoveredAt,
      };
    });
  },
  markExpired: (reason) => {
    set({ status: 'expired', expiredReason: reason });
  },
  setOnline: (isOnline) => {
    set({ isOnline });
  },
  reset: () => {
    set({
      status: 'unknown',
      expiredReason: null,
      lastValidatedAt: null,
      recoveryPending: false,
      recoveredAt: null,
      isOnline: initialOnline(),
    });
  },
}));

export const isSessionExpired = (): boolean =>
  useSessionStore.getState().status === 'expired';
