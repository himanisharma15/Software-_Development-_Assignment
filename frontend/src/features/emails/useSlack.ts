import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import type { SlackStatus } from '../../types/api';

export function useSlack() {
  return useQuery({
    queryKey: ['slack-status'],
    queryFn: async (): Promise<SlackStatus> => {
      const { data } = await api.get<SlackStatus>('/slack/status');
      return data;
    },
    refetchInterval: 10000
  });
}