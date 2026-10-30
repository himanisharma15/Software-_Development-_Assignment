import { prisma } from '../../config/db.js';

export async function createScheduledEmailsBatch(payload: Array<{
  userId: string;
  senderId: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  jobId: string;
}>) {
  return prisma.$transaction(async (tx: any) => {
    const items = payload.map((entry) => ({
      ...entry,
      status: 'scheduled'
    }));

    return (tx as any).email.createMany({
      data: items
    });
  });
}
