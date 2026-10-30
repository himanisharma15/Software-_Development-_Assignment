import { forwardRef, type TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, id, className = '', ...props }, ref) {
  const textareaId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium text-text" htmlFor={textareaId}>
      <span>{label}</span>
      <textarea
        ref={ref}
        id={textareaId}
        className={`w-full resize-y rounded-control border border-border bg-surface-raised px-3 py-2.5 text-sm leading-6 text-text placeholder:text-muted-light focus:border-primary focus:outline-none focus:shadow-focus ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="text-xs font-normal text-danger">{error}</span>}
    </label>
  );
});

export default Textarea;