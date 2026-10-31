
import { Router } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { createJwtToken, requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

// Google Login
router.get('/google', (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      message: 'Google OAuth is not configured'
    });
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  return res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
});

// Google OAuth Callback
router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        message: 'Google OAuth is not configured'
      });
    }

    const code =
      typeof req.query.code === 'string' ? req.query.code : null;

    if (!code) {
      return res.status(400).json({
        message: 'Missing Google auth code'
      });
    }

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code'
        })
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Google token exchange failed:', error);

      return res.status(401).json({
        message: 'Google authentication failed'
      });
    }

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
    };

    if (!tokenData.access_token) {
      return res.status(401).json({
        message: 'Google access token not received'
      });
    }

    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    if (!userResponse.ok) {
      return res.status(401).json({
        message: 'Failed to fetch Google user information'
      });
    }

    const userInfo = await userResponse.json() as {
      id?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!userInfo.email) {
      return res.status(400).json({
        message: 'Google profile missing email'
      });
    }

    const user = await prisma.user.upsert({
      where: {
        email: userInfo.email
      },
      update: {
        googleId: userInfo.id ?? undefined,
        name: userInfo.name ?? 'Google user',
        avatarUrl: userInfo.picture ?? null
      },
      create: {
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name ?? 'Google user',
        avatarUrl: userInfo.picture ?? null
      }
    });

    const token = createJwtToken(user);

    res.cookie('token', token, cookieOptions);

    return res.redirect(
      `${env.FRONTEND_URL.replace(/\/$/, '')}/dashboard`
    );
  })
);

// Get logged-in user
router.get('/me', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  return res.json({
    id: authReq.user?.id,
    name: authReq.user?.name,
    email: authReq.user?.email,
    avatarUrl: authReq.user?.avatarUrl
  });
});

// Logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });

  return res.json({
    ok: true,
    message: 'Logged out successfully'
  });
});

export default router;
