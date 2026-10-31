import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { normalizeEmailItems } from '../features/emails/formatters';
import { useSlack } from '../features/emails/useSlack';
import { useAuth } from '../hooks/useAuth';
import type { EmailItem, PaginatedResponse } from '../types/api';
import { formatLocalDateTime } from '../utils/date';

export default function EmailDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const slackStatus = useSlack();
  const routeEmail = (location.state as { email?: EmailItem } | null)?.email;

  const emailQuery = useQuery({
    queryKey: ['emails', 'detail', id],
    initialData: routeEmail?.id === id ? routeEmail : undefined,
    queryFn: async (): Promise<EmailItem | null> => {
      const [scheduled, sent] = await Promise.all([
        api.get<PaginatedResponse<unknown>>('/emails/scheduled', { params: { page: 1, limit: 100 } }),
        api.get<PaginatedResponse<unknown>>('/emails/sent', { params: { page: 1, limit: 100 } })
      ]);
      return [...normalizeEmailItems(scheduled.data.items), ...normalizeEmailItems(sent.data.items)].find((item) => item.id === id) ?? null;
    }
  });

  return (
    <DashboardLayout user={user} slackStatus={slackStatus.data} search="" onSearch={() => undefined} onLogout={() => logout.mutate()}>
      <Button className="mb-5" onClick={() => navigate(-1)} icon={<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="m14 18-6-6 6-6M8 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}>Back</Button>
      {emailQuery.isLoading ? (
        <section className="overflow-hidden rounded-card border border-border bg-surface-raised"><Skeleton rows={4} /></section>
      ) : emailQuery.isError || !emailQuery.data ? (
        <section className="rounded-card border border-border bg-surface-raised"><EmptyState title="Email not found" description="This email may no longer be in the current scheduled or sent lists." actionLabel="Return to mailbox" onAction={() => navigate('/dashboard')} /></section>
      ) : (
        <article className="overflow-hidden rounded-card border border-border bg-surface-raised shadow-panel">
          <header className="border-b border-border p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-xs font-medium text-muted">Email detail</p><h1 className="mt-1 break-words text-xl font-semibold text-text sm:text-2xl">{emailQuery.data.subject}</h1></div>
              <Badge status={emailQuery.data.status} />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">From</dt><dd className="mt-1 font-medium text-text">{emailQuery.data.sender?.email ?? 'Email sender'}</dd></div>
              <div><dt className="text-xs text-muted">To</dt><dd className="mt-1 break-all font-medium text-text">{emailQuery.data.toEmail ?? emailQuery.data.to ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted">{emailQuery.data.status === 'scheduled' || emailQuery.data.status === 'processing' ? 'Scheduled time' : 'Sent time'}</dt><dd className="mt-1 font-medium text-text">{formatLocalDateTime(emailQuery.data.status === 'scheduled' || emailQuery.data.status === 'processing' ? emailQuery.data.scheduledAt : emailQuery.data.sentAt)}</dd></div>
            </dl>
          </header>
          {emailQuery.data.messageId?.startsWith('simulated:') && <p className="border-b border-border bg-warning-tint px-5 py-3 text-sm text-warning sm:px-7">Demo mode: this email is recorded in the app only. No external email was delivered.</p>}
          <div className="whitespace-pre-wrap p-5 text-sm leading-7 text-text sm:p-7">{emailQuery.data.body ?? 'No message body is available.'}</div>
          {emailQuery.data.previewUrl && <footer className="border-t border-border px-5 py-4 sm:px-7"><a href={emailQuery.data.previewUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">Open Ethereal preview</a></footer>}
        </article>
      )}
      <Link to="/dashboard" className="sr-only">Back to mailbox</Link>
    </DashboardLayout>
  );
}
