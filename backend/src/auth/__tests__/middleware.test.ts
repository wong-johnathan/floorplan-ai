import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware';
import { signJwt } from '../jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-min-32-chars-padpadpad';
});

function mockReq(token?: string): Partial<Request> {
  return { cookies: token ? { token } : {} } as Partial<Request>;
}

function mockRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('requireAuth', () => {
  it('returns 401 when no cookie is present', () => {
    const res = mockRes();
    requireAuth(mockReq() as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for an invalid token', () => {
    const res = mockRes();
    requireAuth(mockReq('bad.token.here') as any, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next and attaches req.user for a valid token', () => {
    const token = signJwt({ userId: 'cuid_1', role: 'user' });
    const req = mockReq(token) as any;
    const next = vi.fn();
    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ userId: 'cuid_1', role: 'user' });
  });
});
