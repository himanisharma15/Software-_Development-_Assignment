import type { ReactNode } from 'react';

type ChipProps = {
  children: ReactNode;
  onRemove?: () => void;
};

export default function Chip({ children, onRemove }: ChipProps) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-primary bg-background px-2.5 py-1 text-xs font-medium text-primary">
      <span className="truncate">{children}</span>
      {onRemove && <button type="button" className="rounded-full px-0.5 text-primary hover:bg-primary/10" aria-label={`Remove ${String(children)}`} onClick={onRemove}>×</button>}
    </span>
  );
}