import type { ReactNode } from 'react';

interface IIconButtonProps {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}

export default function IconButton({ label, onClick, children }: IIconButtonProps) {
  return (
    <button
      type="button"
      className="h-9 w-9 rounded-xl border border-border bg-secondary text-fg-subtle flex items-center justify-center hover:bg-secondary-hover hover:text-fg transition-colors"
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}
