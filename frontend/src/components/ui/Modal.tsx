import { useEffect, type ReactNode } from 'react';

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  widthClass?: string;
};

export default function Modal({ title, children, onClose, widthClass = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-overlay p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`my-auto w-full ${widthClass} rounded-panel border border-border bg-surface-raised shadow-panel`}>
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 id="modal-title" className="text-lg font-semibold text-text">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-control p-2 text-muted hover:bg-surface hover:text-text">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-6">{children}</div>
      </section>
    </div>
  );
}