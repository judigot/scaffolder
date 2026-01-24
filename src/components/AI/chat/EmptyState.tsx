import type { ReactNode } from 'react';

export interface IEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: IEmptyStateProps) {
  const defaultIcon = (
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 mb-4">
      <svg
        className="w-8 h-8 text-fg"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <title>Judas - App Magician</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="max-w-2xl w-full space-y-4 md:space-y-8">
        <div className="text-center space-y-4">
          {icon ?? defaultIcon}
          <h2 className="text-2xl md:text-3xl font-bold text-fg">{title}</h2>
          <p className="text-sm md:text-base text-fg-muted leading-snug md:leading-relaxed">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
