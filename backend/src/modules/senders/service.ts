import nodemailer from 'nodemailer';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

export async function ensureSendersSeeded(userId?: string) {
  const targetUserId = userId ?? (await prisma.user.findFirst({ select: { id: true } }))?.id;

  if (!targetUserId) {
    return;
  }

  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM) {
    const existing = await prisma.sender.findFirst({
      where: { userId: targetUserId, email: env.SMTP_FROM }
    });
    const senderData = {
      email: env.SMTP_FROM,
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT,
      smtpUser: env.SMTP_USER,
      smtpPass: env.SMTP_PASS
    };

    if (existing) {
      await prisma.sender.update({ where: { id: existing.id }, data: senderData });
    } else {
      await prisma.sender.create({ data: { userId: targetUserId, ...senderData } });
    }
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
    where: { userId, ...(env.SMTP_FROM ? { email: env.SMTP_FROM } : {}) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      email: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      createdAt: true
    }
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
