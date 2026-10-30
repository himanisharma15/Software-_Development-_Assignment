type SpinnerProps = {
  label?: string;
  size?: 'sm' | 'md';
};

export default function Spinner({ label = 'Loading', size = 'md' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={`inline-block animate-spin rounded-full border-2 border-primary/25 border-t-primary ${size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'}`} />
  );
}