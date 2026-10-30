type AvatarProps = {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

export default function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  return src
    ? <img src={src} alt="" className={`${sizes[size]} rounded-full border border-border object-cover`} />
    : <span aria-label={name} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary-tint font-semibold text-primary ${sizes[size]}`}>{initials}</span>;
}