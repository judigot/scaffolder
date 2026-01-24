import type { ReactNode } from 'react';

export interface IFeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  variant?: 'primary' | 'info' | 'success' | 'warning';
  onClick?: () => void;
}

export function FeatureCard({
  title,
  description,
  icon,
  variant = 'primary',
  onClick,
}: IFeatureCardProps) {
  const variantStyles = {
    primary: 'hover:border-primary-500/30',
    info: 'hover:border-info-500/30',
    success: 'hover:border-success-500/30',
    warning: 'hover:border-warning-500/30',
  };

  const iconBgStyles = {
    primary: 'bg-primary-500/10 group-hover:bg-primary-500/15',
    info: 'bg-info-500/10 group-hover:bg-info-500/15',
    success: 'bg-success-500/10 group-hover:bg-success-500/15',
    warning: 'bg-warning-500/10 group-hover:bg-warning-500/15',
  };

  return (
    <div
      className={`bg-bg-muted/30 backdrop-blur-sm border border-border/50 rounded-2xl p-3 md:p-5 ${variantStyles[variant]} transition-all duration-300 cursor-pointer group`}
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-3 text-center md:text-left">
        <div
          className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${iconBgStyles[variant]} flex items-center justify-center flex-shrink-0 transition-colors`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xs md:text-sm font-semibold text-fg mb-1 md:mb-1.5 leading-tight">
            {title}
          </h3>
          <p className="text-[10px] md:text-xs text-fg-muted/70 leading-snug line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
