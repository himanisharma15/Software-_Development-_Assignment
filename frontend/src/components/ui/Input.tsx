import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium text-text" htmlFor={inputId}>
      {label && <span>{label}</span>}
      <input
        id={inputId}
        className={`min-h-11 w-full rounded-control border border-border bg-surface-raised px-3 py-2.5 text-sm text-text placeholder:text-muted-light focus:border-primary focus:outline-none focus:shadow-focus ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="text-xs font-normal text-danger">{error}</span>}
    </label>
  );
}