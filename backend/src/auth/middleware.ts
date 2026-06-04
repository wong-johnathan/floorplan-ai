import type { Request, Response, NextFunction } from 'express';
import { verifyJwt, type JwtPayload } from './jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
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
  req.user = payload;
  next();
}
