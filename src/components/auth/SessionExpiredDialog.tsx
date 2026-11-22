import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ISessionExpiredDialogProps {
  isOpen: boolean;
  isRedirecting: boolean;
  /** Set when the redirect budget is exhausted (prevents login loops). */
  loopPrevented: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * Blocking, accessible "Session expired" dialog. It intentionally has no
 * close button: protected operations are blocked until the user signs in,
 * and the current page/context is preserved for after the redirect.
 */
export default function SessionExpiredDialog({
  isOpen,
  isRedirecting,
  loopPrevented,
  onSignIn,
  onSignOut,
}: ISessionExpiredDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const signInRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    signInRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Not dismissible: keep the user on the recovery path.
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab' || dialogRef.current === null) {
        return;
      }
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled])',
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      data-testid="session-expired-overlay"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-testid="session-expired-dialog"
        className="w-full sm:max-w-md bg-bg-subtle border border-border rounded-t-2xl sm:rounded-xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="shrink-0 w-10 h-10 rounded-full bg-warning-900/40 border border-warning-700/40 flex items-center justify-center text-warning-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Session locked</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              Session expired
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-fg-muted">
              {loopPrevented
                ? 'We could not restore your session automatically. Sign out and sign in again to continue.'
                : 'For your security, you were signed out after a period of inactivity. Sign in again to pick up where you left off. Your current page and selections are kept.'}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={onSignOut}
            disabled={isRedirecting}
          >
            Sign out
          </button>
          {!loopPrevented && (
            <button
              ref={signInRef}
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={onSignIn}
              disabled={isRedirecting}
              aria-busy={isRedirecting}
            >
              {isRedirecting ? 'Redirecting…' : 'Sign in again'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
