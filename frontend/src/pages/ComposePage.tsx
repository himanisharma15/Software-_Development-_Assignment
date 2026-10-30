import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import Input from '../components/ui/Input';
import Popover from '../components/ui/Popover';
import Spinner from '../components/ui/Spinner';
import Textarea from '../components/ui/Textarea';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { useSlack } from '../features/emails/useSlack';
import type { Sender } from '../types/api';

function localDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function tomorrowAt(hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return localDateTimeValue(date);
}

function errorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? error.message;
  return error instanceof Error ? error.message : 'Unable to schedule the campaign.';
}

export default function ComposePage() {
  const { user, logout } = useAuth();
  const slackStatus = useSlack();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState(5000);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [laterOpen, setLaterOpen] = useState(false);
  const [laterTime, setLaterTime] = useState(tomorrowAt(10));
  const [error, setError] = useState('');

  const sendersQuery = useQuery({
    queryKey: ['senders'],
    queryFn: async () => (await api.get<{ senders: Sender[] }>('/senders')).data.senders
  });

  const parseMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const { data } = await api.post<{ count: number; emails: string[] }>('/emails/parse-leads', formData);
      return data;
    },
    onSuccess: (data) => {
      setEmails(data.emails);
      toast.success(`${data.count} emails detected`);
    },
    onError: (cause: unknown) => toast.error(errorMessage(cause))
  });

  const scheduleMutation = useMutation({
    mutationFn: async (scheduledFor: string) => {
      if (!subject.trim()) throw new Error('Add a subject before scheduling.');
      if (!body.trim()) throw new Error('Add a message before scheduling.');
      if (!file || emails.length === 0) throw new Error('Upload a list with valid email addresses.');
      const scheduledDate = new Date(scheduledFor);
      if (Number.isNaN(scheduledDate.getTime())) throw new Error('Choose a valid send time.');
      if (scheduledDate.getTime() < Date.now()) throw new Error('Send time must be in the future.');
      if (!Number.isFinite(delayBetweenMs) || delayBetweenMs < 0) throw new Error('Delay must be zero or greater.');
      if (!Number.isFinite(hourlyLimit) || hourlyLimit < 1) throw new Error('Hourly limit must be at least one.');

      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('body', body.trim());
      formData.append('startTime', scheduledDate.toISOString());
      formData.append('delayBetweenMs', String(delayBetweenMs));
      formData.append('hourlyLimit', String(hourlyLimit));
      formData.append('file', file);
      return (await api.post<{ message?: string }>('/emails/schedule', formData)).data;
    },
    onSuccess: (data) => {
      toast.success(data.message ?? 'Emails scheduled successfully');
      void queryClient.invalidateQueries({ queryKey: ['emails'] });
      navigate('/dashboard?view=scheduled');
    },
    onError: (cause: unknown) => setError(errorMessage(cause))
  });

  const handleFile = (selected: File | null) => {
    setFile(selected);
    setEmails([]);
    setError('');
    parseMutation.reset();
    if (selected) parseMutation.mutate(selected);
  };

  const formatSelection = (before: string, after = before) => {
    const input = bodyInput.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selection = body.slice(start, end);
    const updated = `${body.slice(0, start)}${before}${selection || 'text'}${after}${body.slice(end)}`;
    setBody(updated);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, start + before.length + (selection || 'text').length);
    });
  };

  const createScheduleNow = () => scheduleMutation.mutate(localDateTimeValue(new Date(Date.now() + 1000)));
  const pickPreset = (hour: number) => setLaterTime(tomorrowAt(hour));
  const logoutNow = () => logout.mutate();
  const selectedSenderEmail = sendersQuery.data?.find((sender) => sender.id === selectedSender)?.email ?? sendersQuery.data?.[0]?.email ?? 'Select a sender';

  return (
    <DashboardLayout user={user} slackStatus={slackStatus.data} search="" onSearch={() => undefined} onLogout={logoutNow}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <Link to="/dashboard" className="text-sm font-semibold text-text hover:text-primary">← Compose New Email</Link>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Upload recipient list" title="Upload List" onClick={() => fileInput.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><path d="m8.5 12.5 6.8-6.8a3.1 3.1 0 0 1 4.4 4.4l-8.8 8.8a5 5 0 0 1-7.1-7.1l8.5-8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" aria-label="Choose send later time" title="Send Later" onClick={() => setLaterOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
          <Button variant="outline-primary" className="rounded-pill px-5" disabled={scheduleMutation.isPending || parseMutation.isPending} onClick={createScheduleNow}>{scheduleMutation.isPending ? <Spinner size="sm" label="Sending" /> : null}Send</Button>
          <Button variant="outline-primary" className="rounded-pill px-4" disabled={scheduleMutation.isPending || parseMutation.isPending} onClick={() => setLaterOpen(true)}>Send Later</Button>
        </div>
      </div>

      <section className="w-full bg-background">
        <div className="grid gap-0 divide-y divide-border border-y border-border">
          <label className="grid gap-2 py-3 sm:grid-cols-[100px_1fr] sm:items-center">
            <span className="text-sm font-medium text-muted">From</span>
            <select aria-label="From sender" value={selectedSender || sendersQuery.data?.[0]?.id || ''} onChange={(event) => setSelectedSender(event.target.value)} className="min-h-9 w-fit max-w-full rounded-control border border-border bg-surface px-3 text-xs text-text focus:border-primary focus:outline-none focus:shadow-focus">
              {(sendersQuery.data ?? []).map((sender) => <option key={sender.id} value={sender.id}>{sender.email}</option>)}
            </select>
          </label>

          <div className="grid gap-3 py-3 sm:grid-cols-[100px_1fr] sm:items-start">
            <span className="pt-2 text-sm font-medium text-muted">To</span>
            <div className="flex min-h-10 flex-wrap items-center gap-2">
              {emails.slice(0, 8).map((email) => <Chip key={email}>{email}</Chip>)}
              {emails.length > 8 && <span className="text-xs text-muted">+{emails.length - 8} more</span>}
              <button type="button" className="text-sm font-semibold text-primary underline-offset-4 hover:underline" onClick={() => fileInput.current?.click()}>Upload List</button>
              <input ref={fileInput} type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" aria-label="Upload recipient list" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
              {file && <span className="text-xs text-muted">{file.name}</span>}
              {parseMutation.isPending && <Spinner size="sm" label="Parsing recipients" />}
              {emails.length > 0 && <span className="text-xs text-primary">{emails.length} emails detected</span>}
            </div>
          </div>

          <label className="grid gap-2 py-3 sm:grid-cols-[100px_1fr] sm:items-center">
            <span className="text-sm font-medium text-muted">Subject</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Add a subject" className="min-h-10 border-0 bg-transparent text-sm font-semibold text-text placeholder:font-normal placeholder:text-muted focus:outline-none" />
          </label>
        </div>

        <div className="flex flex-wrap gap-5 border-b border-border py-3 sm:gap-8">
          <Input label="Delay between 2 emails" name="delayBetweenMs" type="number" min="0" value={delayBetweenMs} onChange={(event) => setDelayBetweenMs(Number(event.target.value))} className="min-h-8 w-20 px-2 py-1 text-xs" />
          <Input label="Hourly Limit" name="hourlyLimit" type="number" min="1" value={hourlyLimit} onChange={(event) => setHourlyLimit(Number(event.target.value))} className="min-h-8 w-20 px-2 py-1 text-xs" />
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-1 rounded-t-control border border-border bg-surface px-3 py-1.5" role="toolbar" aria-label="Message formatting">
            <button type="button" aria-label="Bold selected text" className="rounded-control px-2.5 py-1.5 text-sm font-bold text-muted hover:bg-primary-tint hover:text-primary" onClick={() => formatSelection('**')}>B</button>
            <button type="button" aria-label="Italic selected text" className="rounded-control px-2.5 py-1.5 text-sm italic text-muted hover:bg-primary-tint hover:text-primary" onClick={() => formatSelection('_')}>I</button>
            <button type="button" aria-label="Insert link format" className="rounded-control px-2.5 py-1.5 text-sm text-muted hover:bg-primary-tint hover:text-primary" onClick={() => formatSelection('[', '](url)')}>Link</button>
            <span className="mx-2 h-5 w-px bg-border" />
            <button type="button" aria-label="Insert bullet" className="rounded-control px-2.5 py-1.5 text-sm text-muted hover:bg-primary-tint hover:text-primary" onClick={() => setBody((current) => `${current}${current.endsWith('\n') || !current ? '' : '\n'}• `)}>List</button>
          </div>
          <Textarea ref={bodyInput} label="Message body" name="messageBody" value={body} onChange={(event) => setBody(event.target.value)} rows={13} placeholder="Type Your Reply…" className="min-h-[280px] rounded-t-none border border-t-0 border-border bg-surface px-4 py-4 focus:shadow-none" />
        </div>
      </section>

      {selectedSenderEmail && <p className="mt-3 text-xs text-muted">Sender accounts are scheduled using the existing rotation policy.</p>}
      {error && <p role="alert" className="mt-4 rounded-control border border-danger/20 bg-danger-tint px-4 py-3 text-sm text-danger">{error}</p>}

      <Popover open={laterOpen} onClose={() => setLaterOpen(false)} className="max-w-md">
        <h2 className="text-lg font-semibold text-text">Send later</h2>
        <p className="mt-1 text-sm text-muted">Choose a local date and time for this campaign.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => pickPreset(10)}>Tomorrow 10:00 AM</Button>
          <Button onClick={() => pickPreset(11)}>Tomorrow 11:00 AM</Button>
          <Button className="col-span-2" onClick={() => pickPreset(15)}>Tomorrow 3:00 PM</Button>
        </div>
        <Input className="mt-4" label="Date and time" name="sendLaterTime" type="datetime-local" value={laterTime} onChange={(event) => setLaterTime(event.target.value)} />
        <div className="mt-5 flex justify-end gap-4 border-t border-border pt-4">
          <button type="button" className="px-2 py-2 text-sm text-muted hover:text-text" onClick={() => setLaterOpen(false)}>Cancel</button>
          <Button variant="outline-primary" className="rounded-pill px-5" disabled={scheduleMutation.isPending || parseMutation.isPending} onClick={() => { setError(''); scheduleMutation.mutate(laterTime); setLaterOpen(false); }}>Done</Button>
        </div>
      </Popover>
    </DashboardLayout>
  );
}
