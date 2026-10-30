import Button from './Button';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3">
      <p className="text-xs text-muted">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
      <div className="flex gap-2">
        <Button className="min-h-8 px-3 py-1 text-xs" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <Button className="min-h-8 px-3 py-1 text-xs" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}