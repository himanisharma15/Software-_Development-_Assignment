import { Router } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { ensureSendersSeeded, getUserSenders } from './service.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  await ensureSendersSeeded(userId);
  const senders = await getUserSenders(userId);
  res.json({ senders });
});

router.post('/seed', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  await ensureSendersSeeded(userId);
  const senders = await getUserSenders(userId);

  res.json({ ok: true, senders });
});

export default router;
