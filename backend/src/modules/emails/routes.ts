
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../../config/db.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { parseLeadInput, isValidEmail } from '../../utils/email.js';
import { emailQueue } from '../../queue/queue.js';
import {
  searchEmails,
  updateElasticEmail
} from '../search/elasticsearch.js';
import {
  ensureSendersSeeded,
  getUserSenders
} from '../senders/service.js';
import { logger } from '../../lib/logger.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Normalize and validate email addresses
function normalizeLeads(input: unknown): string[] {
  let emails: string[] = [];

  if (Array.isArray(input)) {
    emails = input.flatMap((value) =>
      typeof value === 'string' ? parseLeadInput(value) : []
    );
  } else if (typeof input === 'string') {
    emails = parseLeadInput(input);
  }

  return [
    ...new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter(isValidEmail)
    )
  ];
}

// Parse CSV leads
router.post(
  '/parse-leads',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      const fileContent =
        req.file?.buffer.toString('utf-8') ?? '';

      const emails = normalizeLeads(fileContent);

      return res.status(200).json({
        success: true,
        count: emails.length,
        emails
      });
    } catch (error) {
      console.error('Parse leads error:', error);

      return res.status(500).json({
        message: 'Failed to parse CSV file'
      });
    }
  }
);

// Schedule emails
router.post(
  '/schedule',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          message: 'Unauthorized'
        });
      }

      const body = req.body ?? {};

      // Get leads from request body
      const bodyLeads = normalizeLeads(body.leads);

      // Get leads from uploaded CSV
      const fileContent =
        req.file?.buffer.toString('utf-8') ?? '';

      const fileLeads = normalizeLeads(fileContent);

      // Combine and remove duplicates
      const uniqueLeads = [
        ...new Set([...bodyLeads, ...fileLeads])
      ];

      // Validate subject and body
      const subject = String(body.subject ?? '').trim();
      const content = String(body.body ?? '').trim();
      const requestedSenderId = String(body.senderId ?? '').trim();

      if (!subject || !content) {
        return res.status(400).json({
          message: 'Subject and email body are required'
        });
      }

      // Validate start time
      const startTime = new Date(body.startTime);

      if (
        !body.startTime ||
        Number.isNaN(startTime.getTime())
      ) {
        return res.status(400).json({
          message: 'Please provide a valid start time'
        });
      }

      // Validate delay
      const delayBetweenMs = Number(
        body.delayBetweenMs ?? 0
      );

      if (
        !Number.isFinite(delayBetweenMs) ||
        delayBetweenMs < 0
      ) {
        return res.status(400).json({
          message: 'Invalid delay between emails'
        });
      }

      // Check email leads
      if (uniqueLeads.length === 0) {
        return res.status(400).json({
          message: 'No valid email addresses were detected'
        });
      }

      let senders = await getUserSenders(userId);

      if (!senders || senders.length === 0) {
        await ensureSendersSeeded(userId);
        senders = await getUserSenders(userId);
      }

      if (requestedSenderId && !senders.some((sender) => sender.id === requestedSenderId)) {
        return res.status(400).json({ message: 'Selected sender is not available for this account.' });
      }

      if (!senders || senders.length === 0) {
        return res.status(400).json({
          message:
            'No senders available. Please add or seed sender accounts first.'
        });
      }

      const now = Date.now();

      const rows: Array<any> = [];

      // Create scheduled email records
      for (
        let index = 0;
        index < uniqueLeads.length;
        index += 1
      ) {
        const emailAddress = uniqueLeads[index];

        const sender = requestedSenderId
          ? senders.find((candidate) => candidate.id === requestedSenderId)!
          : senders[index % senders.length];

        const scheduledAt = new Date(
          Math.max(
            startTime.getTime() + index * delayBetweenMs,
            now
          )
        );

        const emailId = globalThis.crypto.randomUUID();

        rows.push({
          id: emailId,
          userId,
          senderId: sender.id,
          toEmail: emailAddress,
          subject,
          body: content,
          scheduledAt,
          status: 'scheduled',
          jobId: emailId,
          createdAt: new Date(),
          updatedAt: new Date(),
          attempts: 0
        });
      }

      // Save emails in database
      await prisma.email.createMany({
        data: rows
      });

      // Add emails to BullMQ queue
      for (const row of rows) {
        const scheduledAtMs = new Date(row.scheduledAt).getTime();
        const delay = Math.max(0, scheduledAtMs - Date.now());

        const addedJob = await emailQueue.add(
          row.jobId,
          {
            emailId: row.id,
            userId,
            senderId: row.senderId
          },
          {
            jobId: row.jobId,
            delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            },
            removeOnComplete: false,
            removeOnFail: false
          }
        );

        logger.info(
          {
            queueName: 'email-queue',
            jobId: addedJob.id,
            emailId: row.id,
            delayMs: delay,
            scheduledAt: new Date(scheduledAtMs).toISOString()
          },
          'BullMQ job added to email-queue'
        );

        await updateElasticEmail(row.id);
      }

      return res.status(201).json({
        success: true,
        message: 'Emails scheduled successfully',
        count: rows.length,
        emails: uniqueLeads
      });

    } catch (error) {
      console.error('Email scheduling error:', error);

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to schedule emails'
      });
    }
  }
);

// Get scheduled emails
router.get('/scheduled', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const skip = (page - 1) * limit;

    const where = {
      userId: authReq.user!.id,
      status: {
        in: ['scheduled', 'processing']
      }
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: {
          scheduledAt: 'asc'
        },
        skip,
        take: limit,
        include: {
          sender: true
        }
      }),
      prisma.email.count({ where })
    ]);

    return res.json({
      items: emails,
      page,
      limit,
      total
    });

  } catch (error) {
    console.error('Get scheduled emails error:', error);

    return res.status(500).json({
      message: 'Failed to fetch scheduled emails'
    });
  }
});

// Get sent and failed emails
router.get('/sent', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const skip = (page - 1) * limit;

    const where = {
      userId: authReq.user!.id,
      status: {
        in: ['sent', 'failed']
      }
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: {
          sentAt: 'desc'
        },
        skip,
        take: limit,
        include: {
          sender: true
        }
      }),
      prisma.email.count({ where })
    ]);

    return res.json({
      items: emails,
      page,
      limit,
      total
    });

  } catch (error) {
    console.error('Get sent emails error:', error);

    return res.status(500).json({
      message: 'Failed to fetch sent emails'
    });
  }
});

// Search emails
router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    const hits = q
      ? await searchEmails(q)
      : [];

    return res.json({
      items: hits
    });

  } catch (error) {
    console.error('Search emails error:', error);

    return res.status(500).json({
      message: 'Email search failed'
    });
  }
});

export default router;
