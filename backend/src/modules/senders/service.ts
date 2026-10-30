import nodemailer from 'nodemailer';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

export async function ensureSendersSeeded(userId?: string) {
  const targetUserId = userId ?? (await prisma.user.findFirst({ select: { id: true } }))?.id;

  if (!targetUserId) {
    return;
  }

  const count = await prisma.sender.count({ where: { userId: targetUserId } });
  if (count >= env.SENDER_COUNT) return;

  for (let i = count; i < env.SENDER_COUNT; i += 1) {
    const account = await nodemailer.createTestAccount();

    await prisma.sender.create({
      data: {
        userId: targetUserId,
        email: account.user,
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: account.user,
        smtpPass: account.pass
      }
    });
  }
}

export async function getUserSenders(userId: string) {
  return prisma.sender.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function getNextSenderForUser(userId: string) {
  const senders = await getUserSenders(userId);
  if (senders.length === 0) {
    return null;
  }

  const chosen = senders[0];
  return chosen;
}
