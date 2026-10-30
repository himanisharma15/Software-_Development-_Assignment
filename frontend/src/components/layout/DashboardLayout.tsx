import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { SlackStatus, User } from '../../types/api';
import Avatar from '../ui/Avatar';
import { useEmailCounts } from '../../features/emails/useEmails';
import Header from './Header';
import api from '../../api/client';

 type DashboardLayoutProps = {
  children: ReactNode;
  user: User | null;
  slackStatus?: SlackStatus;
  search: string;
  onSearch: (value: string) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  onFilter?: (filter: string) => void;
};

const API_BASE_URL = api.defaults.baseURL ?? '';

function CountLink({ to, label, count, active, icon, onNavigate }: { to: string; label: string; count: number; active: boolean; icon: ReactNode; onNavigate: () => void }) {
  return (
    <NavLink to={to} onClick={onNavigate} className={`flex min-h-9 items-center gap-2 rounded-control px-2.5 text-sm transition ${active ? 'bg-primary-tint font-medium text-primary' : 'text-muted hover:bg-surface hover:text-text'}`}>
      {icon}<span className="flex-1">{label}</span><span className="text-[11px] tabular-nums text-muted">{count}</span>
    </NavLink>
  );
}

export default function DashboardLayout({ children, user, slackStatus, search, onSearch, onLogout, onRefresh = () => undefined, onFilter = () => undefined }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const counts = useEmailCounts();
  const activeView = new URLSearchParams(location.search).get('view') ?? 'scheduled';

  return (
    <div className="min-h-screen bg-background text-text">
      {sidebarOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-background px-4 transition-transform ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="pt-5">
          <Link to="/dashboard" className="block px-2 text-[26px] font-bold leading-none tracking-[-0.075em] text-text" aria-label="Outbox Labs home">ONB</Link>
        </div>

        <details className="group mt-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-control border border-border p-2 hover:bg-surface">
            <Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text">{user?.name ?? 'User'}</span><span className="block truncate text-[10px] text-muted">{user?.email ?? ''}</span></span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-muted transition group-open:rotate-180" fill="none"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </summary>
          <button type="button" onClick={onLogout} className="ml-12 mt-1 rounded-control px-2 py-1.5 text-xs text-muted hover:bg-surface hover:text-text">Log out</button>
        </details>

        <Link to="/compose" onClick={() => setSidebarOpen(false)} className="mt-3 flex min-h-8 w-full items-center justify-center gap-2 rounded-control border border-primary bg-background px-3 text-xs font-medium text-primary transition hover:bg-primary-tint focus-visible:shadow-focus">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>Compose
        </Link>

        <nav className="mt-7 space-y-1" aria-label="Email folders">
          <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-wide text-muted">Inbox</p>
          <CountLink to="/dashboard?view=scheduled" label="Scheduled" count={counts.scheduled} active={activeView === 'scheduled'} onNavigate={() => setSidebarOpen(false)} icon={<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="M4 5h16v14H4zM4 9h16M8 3v4m8-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
          <CountLink to="/dashboard?view=sent" label="Sent" count={counts.sent} active={activeView === 'sent'} onNavigate={() => setSidebarOpen(false)} icon={<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>} />
        </nav>

        <div className="mt-auto border-t border-border py-3">
          {slackStatus?.connected ? (
            <div className="flex items-center gap-2 rounded-control px-2.5 py-2 text-xs text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /><button type="button" onClick={() => window.open('https://app.slack.com/client/', '_blank', 'noopener,noreferrer')} className="flex-1 text-left">Slack connected</button><button type="button" aria-label="Reconnect Slack" title="Reconnect Slack" onClick={() => { window.location.href = `${API_BASE_URL}/slack/connect`; }} className="text-muted hover:text-primary">↻</button></div>
          ) : (
            <button type="button" onClick={() => { window.location.href = `${API_BASE_URL}/slack/connect`; }} className="flex min-h-9 w-full items-center gap-2 rounded-control px-2.5 text-left text-xs text-muted hover:bg-surface hover:text-text"><span className="h-1.5 w-1.5 rounded-full border border-muted" />Connect Slack</button>
          )}
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[248px]">
        <Header search={search} onSearch={onSearch} onMenu={() => setSidebarOpen(true)} onRefresh={onRefresh} onFilter={onFilter} />
        <main className="w-full px-0 py-1">{children}</main>
      </div>
    </div>
  );
}
