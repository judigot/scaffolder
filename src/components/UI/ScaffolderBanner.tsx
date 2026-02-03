import clsx from 'clsx';
import type { ScaffolderSeverity } from '@/interfaces/scaffolderMessages.ts';

const severityStyles: Record<
  ScaffolderSeverity,
  { icon: string; classes: string }
> = {
  error: { icon: '❌', classes: 'bg-red-900 border-red-500 text-red-50' },
  warning: {
    icon: '⚠️',
    classes: 'bg-yellow-900 border-yellow-500 text-yellow-50',
  },
  info: { icon: 'ℹ️', classes: 'bg-blue-900 border-blue-500 text-blue-50' },
};

interface IScaffolderBannerProps {
  severity: ScaffolderSeverity;
  title: string;
  details?: string[];
  suggestion?: string;
  file?: string;
  line?: number;
  onDismiss?: () => void;
}

export default function ScaffolderBanner({
  severity,
  title,
  details,
  suggestion,
  file,
  line,
  onDismiss,
}: IScaffolderBannerProps) {
  const severityMeta = severityStyles[severity];
  return (
    <div
      className={clsx(
        'border-l-4 px-4 py-3 rounded-s-lg shadow-sm mb-2 flex items-start gap-3',
        severityMeta.classes,
      )}
    >
      <span className="text-lg leading-none" aria-hidden>
        {severityMeta.icon}
      </span>
      <div className="flex-1">
        <p className="font-semibold leading-snug text-sm">{title}</p>
        {file !== undefined && file !== '' && (
          <p className="text-xs text-current opacity-80">
            File: <span className="font-mono">{file}</span>
            {line !== undefined && ` · Line ${String(line)}`}
          </p>
        )}
        {details !== undefined && details.length > 0 && (
          <ul className="text-xs list-disc list-inside space-y-0.5">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
        {suggestion !== undefined && suggestion !== '' && (
          <p className="text-xs mt-1">Suggestion: {suggestion}</p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
