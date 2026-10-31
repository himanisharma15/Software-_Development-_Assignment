export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type Sender = {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdAt: string;
};

export type EmailItem = {
  id: string;
  userId?: string;
  toEmail?: string;
  to?: string;
  subject: string;
  body?: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  status: string;
  previewUrl?: string | null;
  sender?: {
    email?: string;
  } | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type SlackStatus = {
  connected: boolean;
  teamName?: string | null;
  channelId?: string | null;
};
