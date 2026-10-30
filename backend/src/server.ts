
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import http from 'node:http';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';
import { emailQueue, closeQueue } from './queue/queue.js';
import { reconcileScheduledJobs } from './queue/reconcile.js';
import { initElastic, ensureEmailsIndex } from './modules/search/elasticsearch.js';
import { ensureSendersSeeded } from './modules/senders/service.js';
import authRoutes from './modules/auth/routes.js';
import emailsRoutes from './modules/emails/routes.js';
import sendersRoutes from './modules/senders/routes.js';
import slackRoutes from './modules/slack/routes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';

const app = express();
const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath('/admin/queues');

const bullBoardQueues: any[] = [new BullMQAdapter(emailQueue as any)];

createBullBoard({
  queues: bullBoardQueues as any,
  serverAdapter
});

const allowedOrigins = [
  env.FRONTEND_URL?.replace(/\/$/, ''),
  'https://software-development-assignment.vercel.app'
].filter(Boolean);

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'email-job-scheduler' });
});

app.use('/api/auth', authRoutes);
app.use('/api/emails', requireAuth, emailsRoutes);
app.use('/api/senders', requireAuth, sendersRoutes);
app.use('/api/slack', slackRoutes);

app.use('/admin/queues', (req, res, next) => {
  const expected = 'Basic ' + Buffer.from(
    `${env.BULL_BOARD_USER}:${env.BULL_BOARD_PASS}`
  ).toString('base64');

  const header = req.headers.authorization ?? '';

  if (header !== expected) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    return res.status(401).send('Unauthorized');
  }

  return next();
}, serverAdapter.getRouter());

app.use(errorHandler);

let httpServer: http.Server | undefined;
let shutdownPromise: Promise<void> | undefined;

async function startServer() {
  await initElastic();
  await ensureEmailsIndex();

  const firstUser = await prisma.user.findFirst();

  if (firstUser) {
    await ensureSendersSeeded(firstUser.id);
  }

  await reconcileScheduledJobs();

  httpServer = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API server started');
  });
}

function shutdown() {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    logger.info('Shutting down server');

    if (httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    await closeQueue();
    await prisma.$disconnect();
    await redis.quit();

    process.exit(0);
  })();

  return shutdownPromise;
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

startServer().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
