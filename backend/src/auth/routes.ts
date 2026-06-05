import { Router, type Request, type Response } from 'express';
import passport from './passport';
import { signJwt, verifyJwt } from './jwt';
import type { User } from '../generated/client';

const router = Router();
const isProd = process.env.NODE_ENV === 'production';

function frontendUrl() {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000';
}

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${frontendUrl()}/login?error=oauth_failed`,
  }),
  (req: Request, res: Response) => {
    const user = req.user as User;
    const token = signJwt({ userId: user.id, role: user.role });
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(frontendUrl());
  }
);

router.get('/me', (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  res.json(payload);
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
  });
  res.json({ ok: true });
});

export default router;
