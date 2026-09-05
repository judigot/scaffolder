interface IBadgeProps {
  label: string;
  variant?: 'draft' | 'ready' | 'statusActive' | 'statusPlanned' | 'statusDone';
}

const variantClasses: Record<NonNullable<IBadgeProps['variant']>, string> = {
  draft: 'bg-primary-900/40 text-primary-300',
  ready: 'bg-success-900/40 text-success-300',
  statusActive: 'bg-success-900/40 text-success-300',
  statusPlanned: 'bg-primary-900/40 text-primary-300',
  statusDone: 'bg-bg-muted text-fg-subtle',
};

export default function Badge({ label, variant = 'draft' }: IBadgeProps) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${
        variantClasses[variant]
      }`}
    >
      {label}
    </span>
  );
}
