import { elastic } from '../../config/elastic.js';
import { prisma } from '../../config/db.js';

export async function initElastic() {
  try {
    await elastic.ping();
  } catch {
    await elastic.indices.create({
      index: 'emails',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            to: { type: 'text' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' }
          }
        }
      }
    });
  }
}

export async function ensureEmailsIndex() {
  const exists = await elastic.indices.exists({ index: 'emails' }).catch(() => false);
  if (!exists) {
    await elastic.indices.create({
      index: 'emails',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            to: { type: 'text' },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' }
          }
        }
      }
    });
  }
}

export async function updateElasticEmail(emailId: string) {
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { sender: true }
  });

  if (!email) return;

  await elastic.index({
    index: 'emails',
    id: email.id,
    document: {
      id: email.id,
      userId: email.userId,
      senderId: email.senderId,
      sender: email.sender?.email ?? '',
      to: email.toEmail,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt
    }
  });
}

export async function reindexEmails() {
  const emails = await prisma.email.findMany({
    orderBy: { createdAt: 'asc' }
  });

  await elastic.indices.delete({ index: 'emails' }).catch(() => undefined);
  await ensureEmailsIndex();

  for (const email of emails) {
    await elastic.index({
      index: 'emails',
      id: email.id,
      document: {
        id: email.id,
        userId: email.userId,
        senderId: email.senderId,
        to: email.toEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
        sender: email.senderId ? (await prisma.sender.findUnique({ where: { id: email.senderId } }))?.email ?? '' : ''
      }
    });
  }
}

export async function searchEmails(query: string) {
  const result = await elastic.search({
    index: 'emails',
    query: {
      multi_match: {
        query,
        fields: ['to', 'subject', 'body', 'status', 'sender']
      }
    },
    size: 20
  });

  return result.hits.hits.map((hit) => ({
    id: (hit._source as any)?.id,
    subject: (hit._source as any)?.subject,
    to: (hit._source as any)?.to,
    status: (hit._source as any)?.status,
    scheduledAt: (hit._source as any)?.scheduledAt,
    sentAt: (hit._source as any)?.sentAt
  }));
}
