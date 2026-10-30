import type { EmailItem } from '../../types/api';

type DataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeEmailItem(value: unknown): EmailItem {
  const row = isRecord(value) ? value : {};
  const source = isRecord(row._source) ? row._source : row;
  const sender = isRecord(source.sender) ? source.sender : null;
  return {
    id: asString(source.id) ?? asString(row._id) ?? '',
    userId: asString(source.userId),
    toEmail: asString(source.toEmail) ?? asString(source.to),
    to: asString(source.to),
    subject: asString(source.subject) ?? '(no subject)',
    body: asString(source.body),
    scheduledAt: asString(source.scheduledAt) ?? null,
    sentAt: asString(source.sentAt) ?? null,
    status: asString(source.status) ?? 'scheduled',
    previewUrl: asString(source.previewUrl) ?? null,
    sender: sender ? { email: asString(sender.email) } : null
  };
}

export function normalizeEmailItems(values: unknown): EmailItem[] {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeEmailItem);
}