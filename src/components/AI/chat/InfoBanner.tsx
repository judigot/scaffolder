import type { ReactNode } from 'react';
import { Banner } from '@/components/UI/Banner.tsx';

export interface IInfoBannerProps {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  inline?: boolean;
  className?: string;
}

export function InfoBanner({
  title,
  children,
  icon,
  inline,
  className,
}: IInfoBannerProps) {
  return (
    <Banner
      variant="info"
      title={title}
      icon={icon}
      inline={inline}
      className={className}
    >
      {children}
    </Banner>
  );
}
