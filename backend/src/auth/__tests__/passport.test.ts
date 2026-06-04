import { describe, it, expect, afterEach } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { upsertGoogleUser } from '../passport';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

afterEach(async () => {
  await prisma.user.deleteMany({ where: { googleId: 'g-test-upsert' } });
});

describe('upsertGoogleUser', () => {
  it('creates a new user with default role "user"', async () => {
    const user = await upsertGoogleUser({
      id: 'g-test-upsert',
      email: 'upsert@example.com',
      name: 'Upsert Test',
      avatarUrl: null,
    });
    expect(user.googleId).toBe('g-test-upsert');
    expect(user.email).toBe('upsert@example.com');
    expect(user.role).toBe('user');
  });

  it('updates name and email on second call without creating a duplicate row', async () => {
    await upsertGoogleUser({
      id: 'g-test-upsert',
      email: 'old@example.com',
      name: 'Old Name',
      avatarUrl: null,
    });
    const updated = await upsertGoogleUser({
      id: 'g-test-upsert',
      email: 'new@example.com',
      name: 'New Name',
      avatarUrl: null,
    });
    const count = await prisma.user.count({ where: { googleId: 'g-test-upsert' } });
    expect(count).toBe(1);
    expect(updated.name).toBe('New Name');
    expect(updated.email).toBe('new@example.com');
  });
});
