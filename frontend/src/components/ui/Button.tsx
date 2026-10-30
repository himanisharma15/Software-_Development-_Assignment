import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline-primary' | 'secondary' | 'quiet' | 'danger';
  icon?: ReactNode;
};

const variants = {
  primary: 'border-primary bg-primary text-background hover:bg-primary-hover',
  'outline-primary': 'border-primary bg-background text-primary hover:bg-primary hover:text-background',
  secondary: 'border-border bg-surface-raised text-text hover:border-primary hover:bg-primary-tint',
  quiet: 'border-transparent bg-transparent text-muted hover:bg-surface hover:text-text',
  danger: 'border-danger/30 bg-danger-tint text-danger hover:bg-danger/15'
};

export default function Button({ variant = 'secondary', icon, className = '', children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}