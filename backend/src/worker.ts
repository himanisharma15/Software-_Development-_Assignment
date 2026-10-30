import { DelayedError, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import IORedis from 'ioredis';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { redis } from './config/redis.js';
import { prisma } from './config/db.js';
import { updateElasticEmail } from './modules/search/elasticsearch.js';
import { notifySlackRateLimit } from './modules/slack/service.js';
import { checkSenderRateLimit } from './queue/rateLimiter.js';

const RedisCtor = IORedis as any;
const connection = new RedisCtor(env.REDIS_URL, { maxRetriesPerRequest: null });
const transporterCache = new Map<string, nodemailer.Transporter>();

async function getTransporterForSender(sender: { id: string; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string }) {
  const cached = transporterCache.get(sender.id);
  if (cached) {
    return cached;
  }

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass
    }
  });

  transporterCache.set(sender.id, transporter);
  return transporter;
}

const worker = new Worker(
  'email-queue',
  async (job) => {
    const emailId = String(job.data.emailId ?? job.id);
    logger.info({ queueName: 'email-queue', jobId: job.id, emailId }, 'Job received');

    if (!emailId) return;

    const updated = await prisma.email.updateMany({
      where: { id: emailId, status: { in: ['scheduled', 'processing'] } },
      data: { status: 'processing', updatedAt: new Date() }
    });

    if (updated.count === 0) {
      logger.info({ emailId, jobId: job.id }, 'Skipping already processed email job');
      return;
    }

    const email = await prisma.email.findUnique({ where: { id: emailId } });
    if (!email) {
      logger.warn({ emailId }, 'Email missing during send');
      return;
    }

    const sender = email.senderId ? await prisma.sender.findUnique({ where: { id: email.senderId } }) : null;
    if (!sender) {
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'failed', errorMessage: 'No sender available', attempts: email.attempts + 1, updatedAt: new Date() }
      });
      await updateElasticEmail(emailId);
      throw new Error('No sender available');
    }

    const lockKey = `lock:${emailId}`;
    const lockAcquired = await redis.set(lockKey, '1', 'NX', 'EX', 10);
    if (!lockAcquired) {
      logger.info({ emailId, jobId: job.id }, 'Duplicate lock hit; skipping send');
      return;
    }

    try {
      const rateLimit = await checkSenderRateLimit(sender.id);
      if (!rateLimit.allowed) {
        const nextWindow = new Date(rateLimit.resetAt);
        const delayMs = Math.max(0, nextWindow.getTime() - Date.now());

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'scheduled',
            scheduledAt: nextWindow,
            attempts: email.attempts + 1,
            errorMessage: `Sender hourly limit reached (${rateLimit.limit}/hr). Requeued for ${nextWindow.toISOString()}`,
            updatedAt: new Date()
          }
        });

        await job.moveToDelayed(Date.now() + delayMs, job.token);
        if (rateLimit.firstExceeded) {
          try {
            await notifySlackRateLimit(sender.id, sender.email, rateLimit.limit, nextWindow);
          } catch {
            logger.warn({ senderId: sender.id }, 'Slack rate-limit notification failed; email remains rescheduled');
          }
        }
        await updateElasticEmail(emailId);
        logger.warn({ emailId, senderId: sender.id, limit: rateLimit.limit, retryAt: nextWindow }, 'Sender rate limit reached; rescheduled');
        throw new DelayedError();
      }

      const transporter = await getTransporterForSender(sender);
      const result = await transporter.sendMail({
        from: sender.email,
        to: email.toEmail,
        subject: email.subject,
        text: email.body
      });
      const previewUrl = nodemailer.getTestMessageUrl(result);

      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          messageId: result.messageId,
          previewUrl: previewUrl ? String(previewUrl) : null,
          errorMessage: null,
          attempts: email.attempts + 1,
          updatedAt: new Date()
        }
      });

      await updateElasticEmail(emailId);
      logger.info({ emailId, messageId: result.messageId }, 'Email sent');
    } catch (error) {
      if (error instanceof DelayedError) {
        throw error;
      }

      const msg = error instanceof Error ? error.message : 'Unknown error';
      const attemptNumber = (job.attemptsMade ?? 0) + 1;
      const maxAttempts = job.opts.attempts ?? 3;
      const isFinalAttempt = attemptNumber >= maxAttempts;

      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: isFinalAttempt ? 'failed' : 'scheduled',
          errorMessage: msg,
          attempts: attemptNumber,
          updatedAt: new Date()
        }
      });
      await updateElasticEmail(emailId);

      if (isFinalAttempt) {
        logger.error({ emailId, jobId: job.id, attemptNumber, maxAttempts, err: error }, 'Email failed on final attempt');
      } else {
        logger.warn({ emailId, jobId: job.id, attemptNumber, maxAttempts, err: error }, 'Email failed; keeping scheduled for retry');
      }

      throw error;
    } finally {
      await redis.del(lockKey);
    }
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: {
      max: 1,
      duration: env.MIN_DELAY_BETWEEN_EMAILS_MS
    }
  }
);

worker.on('completed', () => {
  logger.info('Job completed');
});

worker.on('error', (error) => {
  logger.error({ err: error }, 'BullMQ worker error');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, attemptsMade: job?.attemptsMade, attempts: job?.opts?.attempts, err }, 'Worker job failed');
});

worker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'BullMQ job stalled');
});

process.on('SIGINT', async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});

logger.info({ concurrency: env.WORKER_CONCURRENCY }, 'Email worker started');
