import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from '../routes';
import { signJwt } from '../jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-min-32-chars-padpadpad';
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_CALLBACK_URL = 'http://localhost:4000/api/auth/google/callback';
});

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('GET /api/auth/me', () => {
  it('returns 401 when no cookie is present', async () => {
    const res = await request(buildApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'unauthorized' });
  });

  it('returns user payload when a valid cookie is present', async () => {
    const token = signJwt({ userId: 'cuid_1', role: 'user' });
    const res = await request(buildApp())
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: 'cuid_1', role: 'user' });
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the token cookie and returns { ok: true }', async () => {
    const token = signJwt({ userId: 'cuid_1', role: 'user' });
    const res = await request(buildApp())
      .post('/api/auth/logout')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    const setCookieHeader = res.headers['set-cookie'] as string[] | undefined;
    expect(setCookieHeader?.some((c) => c.startsWith('token=;'))).toBe(true);
  });
});
