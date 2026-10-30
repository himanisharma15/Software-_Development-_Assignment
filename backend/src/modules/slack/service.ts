import { prisma } from '../../config/db.js';
import { logger } from '../../lib/logger.js';

export async function notifySlackRateLimit(senderId: string, senderEmail: string, limit: number, nextHour: Date) {
  try {
    const sender = await prisma.sender.findUnique({ where: { id: senderId } });
    if (!sender) {
      logger.warn({ senderId }, 'Slack notification skipped; sender no longer exists');
      return;
    }

    const connection = await prisma.slackConnection.findUnique({ where: { userId: sender.userId } });
    if (!connection) {
      logger.debug({ senderId }, 'Slack not connected; skipping notification');
      return;
    }

    const text = `Rate limit reached for sender ${senderEmail} (limit ${limit}/hr). Remaining emails are rescheduled to ${nextHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;

    if (connection.accessToken && connection.channelId) {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ channel: connection.channelId, text }),
        signal: AbortSignal.timeout(10000)
      });

      const result = await response.json() as { ok?: boolean; error?: string; channel?: string; ts?: string };
      if (!response.ok || !result.ok) {
        logger.warn({ senderId, statusCode: response.status, slackError: result.error }, 'Slack chat notification was rejected');
      } else {
        logger.info({ senderId, channelId: result.channel ?? connection.channelId, messageTs: result.ts }, 'Slack rate-limit notification delivered');
      }
      return;
    }

    if (connection.webhookUrl) {
      const response = await fetch(connection.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        logger.warn({ senderId, statusCode: response.status }, 'Slack webhook notification was rejected');
      } else {
        logger.info({ senderId }, 'Slack rate-limit webhook notification delivered');
      }
      return;
    }

    logger.warn({ senderId }, 'Slack notification skipped; connection has no usable token/channel or webhook');
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    logger.warn({ senderId, errorName }, 'Slack notification failed; email processing is unaffected');
  }
}
