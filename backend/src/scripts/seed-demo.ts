import { prisma } from '../config/db.js';
import { emailQueue } from '../queue/queue.js';

async function main() {
  const existing = await prisma.user.findFirst();
  if (!existing) {
    console.log('No user found. Create a user via Google auth before seeding demo emails.');
    return;
  }

  const sender = await prisma.sender.findFirst({ where: { userId: existing.id } });
  if (!sender) {
    console.log('No sender found. Seed Ethereal accounts first.');
    return;
  }

  const now = Date.now();
  const items = Array.from({ length: 1200 }, (_, index) => {
    const scheduledAt = new Date(now + index * 1000);
    return {
      id: `demo-${index}-${Date.now()}`,
      userId: existing.id,
      senderId: sender.id,
      toEmail: `demo${index}@example.com`,
      subject: `Demo campaign ${index + 1}`,
      body: 'This is a demo message scheduled through the BullMQ email queue.',
      scheduledAt,
      status: 'scheduled',
      jobId: `demo-${index}-${Date.now()}`,
      attempts: 0,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
  });

  await prisma.email.createMany({ data: items });
  for (const item of items) {
    await emailQueue.add(item.jobId, { emailId: item.id, userId: item.userId, senderId: item.senderId }, {
      jobId: item.jobId,
      delay: Math.max(0, new Date(item.scheduledAt).getTime() - Date.now()),
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false,
      removeOnFail: false
    });
  }

  console.log(`Seeded ${items.length} demo emails.`);
}

main().catch((error) => {
  console.error('Seed demo failed:', error);
  process.exit(1);
});
