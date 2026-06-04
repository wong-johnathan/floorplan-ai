import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { signJwt, verifyJwt } from '../jwt';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-min-32-chars-padpadpad';
});

describe('signJwt', () => {
  it('returns a three-part JWT string', () => {
    const token = signJwt({ userId: 'cuid_1', role: 'user' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyJwt', () => {
  it('returns the payload for a valid token', () => {
    const token = signJwt({ userId: 'cuid_1', role: 'user' });
    expect(verifyJwt(token)).toMatchObject({ userId: 'cuid_1', role: 'user' });
  });

  it('returns null for a malformed token', () => {
    expect(verifyJwt('not.a.token')).toBeNull();
  });

  it('returns null for an expired token', () => {
    const expired = jwt.sign(
      { userId: 'cuid_1', role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' }
    );
    expect(verifyJwt(expired)).toBeNull();
  });
});
