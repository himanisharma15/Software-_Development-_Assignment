import { prisma } from '../config/db.js';
import { emailQueue } from './queue.js';

export async function reconcileScheduledJobs() {
  const emails = await prisma.email.findMany({
    where: {
      status: { in: ['scheduled', 'processing'] }
    }
  });

  for (const email of emails) {
    const job = await emailQueue.getJob(email.id);
    if (!job) {
      const scheduleAt = email.scheduledAt ? new Date(email.scheduledAt) : new Date();
      const delay = Math.max(0, scheduleAt.getTime() - Date.now());
      await emailQueue.add(email.id, { emailId: email.id, userId: email.userId, senderId: email.senderId }, {
        jobId: email.id,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false
      });
    }
  }
}
