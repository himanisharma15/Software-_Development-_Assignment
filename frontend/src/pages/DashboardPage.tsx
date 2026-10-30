import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import EmailsTable from '../features/emails/EmailsTable';
import { useEmails, type EmailView } from '../features/emails/useEmails';
import { useSlack } from '../features/emails/useSlack';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const slackStatus = useSlack();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const view: EmailView = searchParams.get('view') === 'sent' ? 'sent' : 'scheduled';
  const [pages, setPages] = useState<Record<EmailView, number>>({ scheduled: 1, sent: 1 });
  const page = pages[view];
  const emails = useEmails({ view, page, search });
  const filteredItems = statusFilter === 'all'
    ? emails.items
    : emails.items.filter((item) => item.status.toLowerCase() === statusFilter);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPages({ scheduled: 1, sent: 1 });
  };

  const logoutNow = () => logout.mutate();

  return (
    <DashboardLayout
      user={user}
      slackStatus={slackStatus.data}
      search={search}
      onSearch={changeSearch}
      onLogout={logoutNow}
      onRefresh={() => { void emails.refetch(); }}
      onFilter={setStatusFilter}
    >
      <EmailsTable
        view={view}
        items={filteredItems}
        total={emails.total}
        page={page}
        pageSize={emails.pageSize}
        isLoading={emails.isLoading}
        isError={emails.isError}
        isSearching={emails.isSearching}
        onRetry={() => { void emails.refetch(); }}
        onPageChange={(nextPage) => setPages((current) => ({ ...current, [view]: nextPage }))}
        onCompose={() => { window.location.href = '/compose'; }}
      />
    </DashboardLayout>
  );
}
