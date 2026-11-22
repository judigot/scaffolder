import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/lib/auth/sessionStore.ts';

const BACK_ONLINE_VISIBLE_MS = 3000;

/**
 * Subtle, non-blocking connectivity pill. Shows while offline and briefly
 * confirms when the connection returns. Uses a polite live region so screen
 * readers announce changes without interrupting.
 */
export default function ConnectivityIndicator() {
  const isOnline = useSessionStore((state) => state.isOnline);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOffline.current) {
      return;
    }
    wasOffline.current = false;
    setShowBackOnline(true);
    const timer = window.setTimeout(() => {
      setShowBackOnline(false);
    }, BACK_ONLINE_VISIBLE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isOnline]);

  const visible = !isOnline || showBackOnline;

  return (
    <output
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[900]"
    >
      {visible && (
        <div
          data-testid="connectivity-indicator"
          data-state={isOnline ? 'online' : 'offline'}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
            isOnline
              ? 'bg-success-900/40 border-success-600/40 text-success-300'
              : 'bg-bg-subtle/90 border-warning-700/40 text-warning-200'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block w-2 h-2 rounded-full ${
              isOnline ? 'bg-success-500' : 'bg-warning-400 animate-pulse'
            }`}
          />
          {isOnline
            ? 'Back online'
            : "You're offline. We'll resume when you reconnect."}
        </div>
      )}
    </output>
  );
}
