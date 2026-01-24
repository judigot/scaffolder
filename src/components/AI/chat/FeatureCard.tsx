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
    primary: 'hover:border-primary-500/50',
    info: 'hover:border-info-500/50',
    success: 'hover:border-success-500/50',
    warning: 'hover:border-warning-500/50',
  };

  const iconBgStyles = {
    primary: 'bg-primary-500/10 group-hover:bg-primary-500/20',
    info: 'bg-info-500/10 group-hover:bg-info-500/20',
    success: 'bg-success-500/10 group-hover:bg-success-500/20',
    warning: 'bg-warning-500/10 group-hover:bg-warning-500/20',
  };

  return (
    <div
      className={`bg-bg-muted/50 backdrop-blur-sm border border-border rounded-xl p-4 md:p-5 ${variantStyles[variant]} transition-all duration-200 cursor-pointer group`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${iconBgStyles[variant]} flex items-center justify-center flex-shrink-0 transition-colors`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
          <p className="text-xs text-fg-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
