import { useEffect, type ReactNode } from 'react';

type PopoverProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export default function Popover({ open, onClose, children, className = '' }: PopoverProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-start justify-end bg-transparent px-4 pb-4 pt-[76px] sm:px-7" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`w-full rounded-card border border-border bg-surface-raised p-5 shadow-panel ${className}`}>{children}</div></div>;
}