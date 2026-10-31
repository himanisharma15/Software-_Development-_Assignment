import { Link } from 'react-router-dom';
import type { EmailItem } from '../../types/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Skeleton from '../../components/ui/Skeleton';
import { formatInboxDateTime } from '../../utils/date';
import type { EmailView } from './useEmails';

type EmailsTableProps = {
  view: EmailView;
  items: EmailItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  isSearching: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onCompose: () => void;
};

export default function EmailsTable({ view, items, total, page, pageSize, isLoading, isError, isSearching, onRetry, onPageChange, onCompose }: EmailsTableProps) {
  if (isLoading) return <Skeleton />;
  if (isError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-danger">Emails could not be loaded.</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title={isSearching ? 'No matching emails' : view === 'scheduled' ? 'Nothing scheduled yet' : 'No sent emails yet'}
        description={isSearching ? 'Try another search term.' : view === 'scheduled' ? 'Create a campaign to see scheduled emails here.' : 'Completed and failed deliveries will appear here.'}
        actionLabel={!isSearching && view === 'scheduled' ? 'Compose an email' : undefined}
        onAction={onCompose}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-[700px] divide-y divide-row-border">
          {items.map((item) => {
          const recipient = item.toEmail ?? item.to ?? '—';
          const failed = item.status.toLowerCase() === 'failed';
          const simulated = item.messageId?.startsWith('simulated:') ?? false;
          const timestamp = formatInboxDateTime(view === 'scheduled' ? item.scheduledAt : item.sentAt);
          return (
            <div key={item.id} className="group flex min-h-0 items-center gap-2 px-4 py-3 transition-colors hover:bg-row-hover">
              <Link to={`/emails/${item.id}`} state={{ email: item }} className="grid min-w-0 flex-1 grid-cols-[180px_auto_minmax(0,1fr)] items-center gap-3 text-[13px]">
                <span className="truncate font-normal text-text">To: {recipient}</span>
                <span className="flex items-center gap-2">
                  {view === 'scheduled' ? (
                    <Badge status="scheduled" icon={<svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}>{timestamp}</Badge>
                  ) : (
                    <Badge status={failed ? 'failed' : 'sent'}>{failed ? 'Failed' : simulated ? 'Demo sent' : 'Sent'}</Badge>
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
                  <span className="max-w-[260px] shrink-0 truncate font-medium text-text">{item.subject}</span>
                  <span className="shrink-0 text-muted">—</span>
                  <span className="truncate text-xs text-muted">{item.body ?? 'No message preview available.'}</span>
                </span>
              </Link>
              {view === 'sent' && item.previewUrl ? (
                <a href={item.previewUrl} target="_blank" rel="noreferrer" aria-label="Open Ethereal email preview" title="Open preview" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-muted hover:bg-primary-tint hover:text-primary">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"><path d="M14 4h6v6m-10 4L20 4M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              ) : (
                <Link to={`/emails/${item.id}`} state={{ email: item }} aria-label="Open email details" title="Open details" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-muted transition hover:bg-primary-tint hover:text-primary">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              )}
            </div>
          );
          })}
        </div>
      </div>
      {!isSearching && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />}
    </>
  );
}
