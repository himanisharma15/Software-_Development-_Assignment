import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';

const router = Router();
const SLACK_STATE_TTL_MS = env.SLACK_OAUTH_STATE_TTL_MS;

function createSignedSlackState(userId: string) {
  const payload = JSON.stringify({ userId, ts: Date.now() });
  const signature = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

function verifySignedSlackState(value: string) {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf-8');
    const separatorIndex = decoded.lastIndexOf('.');
    if (separatorIndex <= 0) return null;

    const payload = decoded.slice(0, separatorIndex);
    const signature = decoded.slice(separatorIndex + 1);

    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
    if (signature !== expected) return null;

    const parsed = JSON.parse(payload) as { userId?: string; ts?: number };
    const timestamp = parsed.ts;

    if (!parsed.userId || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;

    const ageMs = Date.now() - timestamp;
    if (ageMs < 0 || ageMs > SLACK_STATE_TTL_MS) return null;

    return parsed.userId;
  } catch {
    return null;
  }
}

router.get('/connect', requireAuth, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    return res.status(500).json({ message: 'Slack OAuth is not configured' });
  }

  const redirectUri = env.SLACK_REDIRECT_URI;

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: 'incoming-webhook chat:write channels:read',
    redirect_uri: redirectUri,
    state: createSignedSlackState(userId)
  });

  logger.info({ userId, redirectUri }, 'Starting Slack OAuth flow');

  return res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state || typeof state !== 'string') {
    logger.warn('Slack OAuth callback missing state parameter');
    return res.status(400).json({ message: 'Invalid Slack OAuth state' });
  }

  const userId = verifySignedSlackState(state);
  if (!userId) {
    logger.warn('Slack OAuth callback rejected invalid or expired state');
    return res.status(400).json({ message: 'Invalid or expired Slack OAuth state' });
  }

  if (!code || typeof code !== 'string') {
    logger.warn({ userId }, 'Slack OAuth callback missing authorization code');
    return res.status(400).json({ message: 'Missing Slack authorization code' });
  }

  const redirectUri = env.SLACK_REDIRECT_URI;

  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    logger.error('Slack OAuth callback attempted without Slack credentials configured');
    return res.status(500).json({ message: 'Slack OAuth is not configured' });
  }

  try {
    const tokenResp = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri
      })
    });

    const data = await tokenResp.json() as {
      ok?: boolean;
      error?: string;
      team?: { id?: string; name?: string };
      incoming_webhook?: { channel?: string; channel_id?: string; url?: string };
      access_token?: string;
    };

    if (!tokenResp.ok || !data.ok) {
      logger.warn({ userId, slackError: data.error }, 'Slack OAuth token exchange failed');
      return res.status(400).json({ message: 'Slack OAuth failed', error: data.error ?? 'unknown_error' });
    }

    const connectionData = {
      userId,
      teamId: data.team?.id ?? null,
      teamName: data.team?.name ?? null,
      channelId: data.incoming_webhook?.channel_id ?? null,
      webhookUrl: data.incoming_webhook?.url ?? null,
      accessToken: data.access_token ?? null
    };

    await prisma.slackConnection.upsert({
      where: { userId },
      update: connectionData,
      create: connectionData
    });

    logger.info({ userId, teamId: connectionData.teamId, teamName: connectionData.teamName }, 'Slack OAuth completed successfully');

    const dashboardUrl = new URL(`${env.FRONTEND_URL}/dashboard`);
    dashboardUrl.searchParams.set('slack', 'connected');
    if (connectionData.teamName) {
      dashboardUrl.searchParams.set('team', connectionData.teamName);
    }

    return res.redirect(dashboardUrl.toString());
  } catch (error) {
    logger.error({ err: error, userId }, 'Slack OAuth callback failed');
    return res.status(500).json({ message: 'Slack OAuth callback failed' });
  }
});

router.get('/status', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.json({ connected: false });

  const connection = await prisma.slackConnection.findUnique({ where: { userId } });
  res.json({ connected: !!connection, teamName: connection?.teamName ?? null, channelId: connection?.channelId ?? null });
});

router.delete('/disconnect', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  await prisma.slackConnection.deleteMany({ where: { userId } });
  res.json({ ok: true });
});

export default router;
