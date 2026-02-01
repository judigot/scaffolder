import type { TerminalModeType } from '@/useTerminalStore.ts';

interface ITerminalModeIndicatorProps {
  currentMode: TerminalModeType;
  onModeChange?: (mode: TerminalModeType) => void;
  /** If true, mode buttons are clickable. If false, bar is informational only. */
  interactive?: boolean;
}

/**
 * Mode indicator pill
 */
function ModeIndicator({
  mode,
  isActive,
  onClick,
  interactive,
}: {
  mode: TerminalModeType;
  isActive: boolean;
  onClick: () => void;
  interactive: boolean;
}) {
  const labels: Record<TerminalModeType, string> = {
    terminal: 'Terminal',
    agent: 'Agent',
    ask: 'Ask',
  };

  const icons: Record<TerminalModeType, React.ReactNode> = {
    terminal: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <title>Terminal</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    agent: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <title>Agent</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    ask: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <title>Ask</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150
				${isActive ? 'shadow-sm' : interactive ? 'hover:opacity-80' : ''}
				${!interactive ? 'cursor-default' : ''}
			`}
      style={{
        background: isActive
          ? 'var(--terminal-mode-indicator-bg-active)'
          : 'var(--terminal-mode-indicator-bg)',
        color: isActive
          ? 'var(--terminal-mode-indicator-text-active)'
          : 'var(--terminal-mode-indicator-text)',
        borderLeft: isActive
          ? '2px solid var(--terminal-mode-indicator-accent)'
          : '2px solid transparent',
      }}
      aria-pressed={isActive}
      aria-label={`${labels[mode]} mode${isActive ? ' (active)' : ''}`}
    >
      {icons[mode]}
      <span>{labels[mode]}</span>
    </button>
  );
}

/**
 * TerminalModeIndicator - Shows current mode clearly
 *
 * Modes:
 * - Terminal: Direct PTY input (default for Terminal Mode)
 * - Agent: AI-assisted command execution
 * - Ask: Natural language queries
 *
 * This bar is informational by default; mode switching is explicit
 * and user-initiated only.
 */
export default function TerminalModeIndicator({
  currentMode,
  onModeChange,
  interactive = false,
}: ITerminalModeIndicatorProps) {
  const modes: TerminalModeType[] = ['terminal', 'agent', 'ask'];

  return (
    <fieldset
      className="flex items-center justify-center gap-1 px-3 py-2 shrink-0 border-0 m-0 p-0"
      style={{
        background: 'var(--terminal-mode-bar-bg)',
        borderTop: '1px solid var(--terminal-mode-bar-border)',
        padding: '0.5rem 0.75rem',
      }}
      aria-label="Terminal mode selector"
    >
      {modes.map((mode) => (
        <ModeIndicator
          key={mode}
          mode={mode}
          isActive={currentMode === mode}
          onClick={() => {
            if (interactive && onModeChange) {
              onModeChange(mode);
            }
          }}
          interactive={interactive}
        />
      ))}
    </fieldset>
  );
}
