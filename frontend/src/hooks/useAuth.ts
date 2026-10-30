import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { User } from '../types/api';

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await api.get<User>('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['auth-user'],
    queryFn: fetchCurrentUser
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth-user'], null);
      window.location.href = '/login';
    }
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data),
    logout,
    refetch: query.refetch
  };
}
