import type { ReactNode } from 'react';

type BadgeProps = {
  status: string;
  children?: ReactNode;
  icon?: ReactNode;
};

const statusStyles: Record<string, string> = {
  sent: 'border-transparent bg-success-tint text-success',
  failed: 'border-transparent bg-danger-tint text-danger',
  scheduled: 'border-transparent bg-warning-tint text-warning',
  processing: 'border-transparent bg-primary-tint text-primary',
  delivered: 'border-transparent bg-success-tint text-success'
};

export default function Badge({ status, children, icon }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status.toLowerCase()] ?? 'border-border bg-surface text-muted'}`}>
      {icon}
      {children ?? status}
    </span>
  );
}