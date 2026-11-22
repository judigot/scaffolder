import { isApiError, toUserMessage } from '@/lib/auth/authErrors.ts';

interface IQueryErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Inline error state with a friendly message and an actionable Retry button.
 * Session-expired errors are handled globally by the session dialog, so
 * this only shows a short hint for them.
 */
export default function QueryErrorState({
  error,
  title = 'Could not load data',
  onRetry,
  isRetrying = false,
  className = '',
}: IQueryErrorStateProps) {
  const kind = isApiError(error) ? error.kind : null;
  const isOffline = kind === 'offline';
  const isSessionExpired = kind === 'session-expired';
  const heading = isOffline
    ? "You're offline"
    : isSessionExpired
      ? 'Sign in to continue'
      : title;

  return (
    <div
      role="alert"
      data-testid="query-error-state"
      data-error-kind={kind ?? 'unknown'}
      className={`p-4 rounded-lg border ${
        isOffline || isSessionExpired
          ? 'bg-bg-muted border-border'
          : 'bg-danger-900/20 border-danger-600/30'
      } ${className}`}
    >
      <p
        className={`text-sm font-medium ${
          isOffline || isSessionExpired ? 'text-fg' : 'text-danger-200'
        }`}
      >
        {heading}
      </p>
      <p className="mt-1 text-sm text-fg-muted">{toUserMessage(error)}</p>
      {onRetry !== undefined && !isSessionExpired && (
        <button
          type="button"
          className="btn-secondary btn-sm mt-3"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  );
}
