import { Router } from 'express';
import { prisma } from '../../config/db.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { ensureSendersSeeded, getUserSenders } from './service.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const senders = await getUserSenders(userId);
  res.json({ senders });
});

router.post('/seed', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  await ensureSendersSeeded();
  const senders = await prisma.sender.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });

  res.json({ ok: true, senders });
});

export default router;
