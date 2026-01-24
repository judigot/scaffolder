import type { ReactNode } from 'react';

export interface IInfoBannerProps {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function InfoBanner({ title, children, icon }: IInfoBannerProps) {
  const defaultIcon = (
    <svg
      className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <title>Info</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  return (
    <div className="bg-gradient-to-r from-primary-500/5 to-primary-700/5 border border-primary-500/10 rounded-2xl p-3 md:p-4">
      <div className="flex items-start gap-2 md:gap-3">
        {icon ?? defaultIcon}
        <div className="text-[10px] md:text-xs text-fg-muted/60 leading-relaxed font-light">
          {title && (
            <span className="text-fg-muted font-normal">{title}</span>
          )}{' '}
          {children}
        </div>
      </div>
    </div>
  );
}
