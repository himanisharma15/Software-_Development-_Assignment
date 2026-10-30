import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import type { EmailItem, PaginatedResponse } from '../../types/api';
import { normalizeEmailItems } from './formatters';

export type EmailView = 'scheduled' | 'sent';

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debouncedValue;
}

type UseEmailsOptions = {
  view: EmailView;
  page: number;
  search: string;
};

export function useEmails({ view, page, search }: UseEmailsOptions) {
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const listQuery = useQuery({
    queryKey: ['emails', view, page],
    enabled: debouncedSearch.length === 0,
    queryFn: async (): Promise<PaginatedResponse<EmailItem>> => {
      const { data } = await api.get<PaginatedResponse<unknown>>(`/emails/${view}`, {
        params: { page, limit: 20 }
      });
      return { ...data, items: normalizeEmailItems(data.items) };
    },
    refetchInterval: debouncedSearch.length === 0 ? 5000 : false
  });

  const searchQuery = useQuery({
    queryKey: ['emails', 'search', debouncedSearch],
    enabled: debouncedSearch.length > 0,
    queryFn: async (): Promise<EmailItem[]> => {
      const { data } = await api.get<{ items: unknown[] }>('/emails/search', {
        params: { q: debouncedSearch }
      });
      return normalizeEmailItems(data.items);
    }
  });

  const searching = debouncedSearch.length > 0;
  return {
    items: searching ? searchQuery.data ?? [] : listQuery.data?.items ?? [],
    total: searching ? searchQuery.data?.length ?? 0 : listQuery.data?.total ?? 0,
    isLoading: searching ? searchQuery.isLoading : listQuery.isLoading,
    isError: searching ? searchQuery.isError : listQuery.isError,
    refetch: searching ? searchQuery.refetch : listQuery.refetch,
    isSearching: searching,
    pageSize: 20
  };
}

export function useEmailCounts() {
  const scheduled = useQuery({
    queryKey: ['emails', 'count', 'scheduled'],
    queryFn: async () => (await api.get<PaginatedResponse<unknown>>('/emails/scheduled', { params: { page: 1, limit: 1 } })).data.total,
    refetchInterval: 5000
  });
  const sent = useQuery({
    queryKey: ['emails', 'count', 'sent'],
    queryFn: async () => (await api.get<PaginatedResponse<unknown>>('/emails/sent', { params: { page: 1, limit: 1 } })).data.total,
    refetchInterval: 5000
  });
  return { scheduled: scheduled.data ?? 0, sent: sent.data ?? 0 };
}