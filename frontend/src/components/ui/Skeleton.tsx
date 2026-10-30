type SkeletonProps = {
  rows?: number;
  columns?: number;
};

export default function Skeleton({ rows = 5, columns = 4 }: SkeletonProps) {
  return (
    <div aria-label="Loading emails" role="status" className="animate-pulse divide-y divide-line">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid min-h-[62px] grid-cols-4 items-center gap-6 px-5">
          {Array.from({ length: columns }, (_, column) => (
            <span key={column} className={`h-3 rounded bg-border ${column === 1 ? 'w-3/4' : 'w-2/3'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}