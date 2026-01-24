import type { ReactNode } from 'react';

export interface IEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: IEmptyStateProps) {
  const defaultIcon = (
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 mb-6">
      <svg
        className="w-10 h-10 text-fg"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <title>Judas - AI Assistant</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="max-w-2xl w-full space-y-8 md:space-y-10 pb-8 pt-6">
        <div className="text-center space-y-6">
          {icon ?? defaultIcon}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-fg tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-sm md:text-base text-fg-muted/80 leading-relaxed font-light">
                {description}
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
