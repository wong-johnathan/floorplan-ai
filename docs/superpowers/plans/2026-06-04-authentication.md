# Authentication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login with JWT stored as an HTTP-only cookie, a Prisma User model, and a frontend auth guard that blocks unauthenticated access.

**Architecture:** Passport.js handles the Google OAuth exchange on the backend; the strategy callback upserts a Prisma User row and signs a stateless JWT stored in an HTTP-only cookie. The frontend reads `/api/auth/me` on mount via TanStack Query to restore session state; a `ProtectedRoute` component redirects unauthenticated users to `/login`. The Vite dev proxy (`/api` → `http://backend:4000`) means all API calls and auth navigation use relative paths.

**Tech Stack:** Express, Passport.js, passport-google-oauth20, jsonwebtoken, cookie-parser, Prisma, PostgreSQL (Docker Compose), React 19, TanStack Query (already installed), React Router v7 (already installed), Vitest, Supertest, React Testing Library

---

## File Map

```
backend/
├── prisma/
│   └── schema.prisma                          NEW — User model
├── src/
│   ├── db/
│   │   └── prisma.ts                          NEW — PrismaClient singleton
│   ├── auth/
│   │   ├── jwt.ts                             NEW — signJwt / verifyJwt
│   │   ├── passport.ts                        NEW — Google strategy + upsertGoogleUser
│   │   ├── middleware.ts                      NEW — requireAuth middleware
│   │   ├── routes.ts                          NEW — /auth/* route handlers
│   │   └── __tests__/
│   │       ├── jwt.test.ts                    NEW
│   │       ├── passport.test.ts               NEW (requires live Postgres)
│   │       ├── middleware.test.ts             NEW
│   │       └── routes.test.ts                 NEW
│   └── index.ts                               MODIFY — cookieParser, CORS credentials, auth router
├── vitest.config.ts                           NEW
└── .env.example                               MODIFY — Google OAuth, JWT, callback, frontend vars

frontend/
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx                    NEW — auth context + provider
│   │   └── __tests__/
│   │       └── AuthContext.test.tsx           NEW
│   ├── components/
│   │   ├── ProtectedRoute.tsx                 NEW — route guard
│   │   └── __tests__/
│   │       └── ProtectedRoute.test.tsx        NEW
│   ├── pages/
│   │   ├── LoginPage.tsx                      NEW — Google sign-in UI
│   │   └── __tests__/
│   │       └── LoginPage.test.tsx             NEW
│   ├── test/
│   │   └── setup.ts                           NEW — jest-dom matchers
│   └── App.tsx                                MODIFY — QueryClient, AuthProvider, routes
└── vite.config.ts                             MODIFY — add test block
```

---

### Task 1: Install backend packages and configure Vitest

**Files:**
- Modify: `backend/package.json`
- Create: `backend/vitest.config.ts`

- [ ] **Step 1: Install runtime and dev dependencies**

Run in `backend/`:
```bash
npm install passport passport-google-oauth20 jsonwebtoken cookie-parser @prisma/client
npm install --save-dev @types/passport @types/passport-google-oauth20 @types/jsonwebtoken @types/cookie-parser prisma vitest supertest @types/supertest
```
Expected: no errors, `node_modules` updated.

- [ ] **Step 2: Add test scripts to package.json**

In `backend/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 4: Verify vitest works**

```bash
cd backend && npx vitest run
```
Expected: "No test files found" (not an error).

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/vitest.config.ts
git commit -m "chore(backend): install auth deps, configure vitest"
```

---

### Task 2: Update environment variables

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/.env.dev`

- [ ] **Step 1: Add missing vars to .env.example**

Append to `backend/.env.example`:
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
JWT_SECRET=
FRONTEND_URL=http://localhost:3000
```

- [ ] **Step 2: Add vars to .env.dev**

Append to `backend/.env.dev` (`.env.dev` is gitignored — fill in real values):
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
JWT_SECRET=dev-jwt-secret-minimum-32-chars-long
FRONTEND_URL=http://localhost:3000
```

To get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: create a project in [Google Cloud Console](https://console.cloud.google.com/), enable the Google OAuth 2.0 API, create OAuth credentials (Web Application type), and add `http://localhost:4000/api/auth/google/callback` as an authorised redirect URI.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example
git commit -m "chore(backend): add Google OAuth, JWT, and frontend URL env vars"
```

---

### Task 3: Prisma setup and User model

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/db/prisma.ts`

Prerequisites: Docker Compose must be running (`docker compose -f docker-compose.dev.yml up -d`).

- [ ] **Step 1: Initialize Prisma**

Run in `backend/`:
```bash
npx prisma init --datasource-provider postgresql
```
Expected: `backend/prisma/schema.prisma` and `backend/.env` created. The `backend/.env` file Prisma generates is separate from our dotenv setup — ignore it, we load env via `dotenv.config()` in `index.ts`.

- [ ] **Step 2: Write schema.prisma**

Replace the entire contents of `backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  googleId  String   @unique
  email     String   @unique
  name      String
  avatarUrl String?
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 3: Run the migration**

```bash
cd backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/floorplan" npx prisma migrate dev --name init_user
```
Expected: migration file created under `backend/prisma/migrations/`, Prisma client generated in `node_modules/.prisma/client`.

Adjust `DATABASE_URL` to match `backend/.env.dev` if the credentials or database name differ.

- [ ] **Step 4: Create the PrismaClient singleton**

```typescript
// backend/src/db/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 5: Confirm TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/ backend/src/db/prisma.ts
git commit -m "feat(backend): add Prisma User model and initial migration"
```

---

### Task 4: JWT utility

**Files:**
- Create: `backend/src/auth/jwt.ts`
- Create: `backend/src/auth/__tests__/jwt.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/auth/__tests__/jwt.test.ts
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
      'test-secret-min-32-chars-padpadpad',
      { expiresIn: '0s' }
    );
    expect(verifyJwt(expired)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx vitest run src/auth/__tests__/jwt.test.ts
```
Expected: FAIL — "Cannot find module '../jwt'"

- [ ] **Step 3: Implement jwt.ts**

```typescript
// backend/src/auth/jwt.ts
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx vitest run src/auth/__tests__/jwt.test.ts
```
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/jwt.ts backend/src/auth/__tests__/jwt.test.ts
git commit -m "feat(backend): add JWT sign/verify utility"
```

---

### Task 5: Passport strategy and upsertGoogleUser

**Files:**
- Create: `backend/src/auth/passport.ts`
- Create: `backend/src/auth/__tests__/passport.test.ts`

Prerequisites: Docker Compose Postgres must be running and migrated (Task 3 complete).

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/auth/__tests__/passport.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { upsertGoogleUser } from '../passport';

const prisma = new PrismaClient();

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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/floorplan" npx vitest run src/auth/__tests__/passport.test.ts
```
Expected: FAIL — "Cannot find module '../passport'"

- [ ] **Step 3: Implement passport.ts**

```typescript
// backend/src/auth/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db/prisma';

export async function upsertGoogleUser(profile: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  return prisma.user.upsert({
    where: { googleId: profile.id },
    update: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
    create: {
      googleId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
  });
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await upsertGoogleUser({
          id: profile.id,
          email: profile.emails?.[0]?.value ?? '',
          name: profile.displayName ?? '',
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });
        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

export default passport;
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5432/floorplan" npx vitest run src/auth/__tests__/passport.test.ts
```
Expected: PASS — 2 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/passport.ts backend/src/auth/__tests__/passport.test.ts
git commit -m "feat(backend): add Passport Google strategy with upsertGoogleUser"
```

---

### Task 6: requireAuth middleware

**Files:**
- Create: `backend/src/auth/middleware.ts`
- Create: `backend/src/auth/__tests__/middleware.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/auth/__tests__/middleware.test.ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx vitest run src/auth/__tests__/middleware.test.ts
```
Expected: FAIL — "Cannot find module '../middleware'"

- [ ] **Step 3: Implement middleware.ts**

```typescript
// backend/src/auth/middleware.ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx vitest run src/auth/__tests__/middleware.test.ts
```
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/middleware.ts backend/src/auth/__tests__/middleware.test.ts
git commit -m "feat(backend): add requireAuth middleware"
```

---

### Task 7: Auth routes

**Files:**
- Create: `backend/src/auth/routes.ts`
- Create: `backend/src/auth/__tests__/routes.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/auth/__tests__/routes.test.ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx vitest run src/auth/__tests__/routes.test.ts
```
Expected: FAIL — "Cannot find module '../routes'"

- [ ] **Step 3: Implement routes.ts**

```typescript
// backend/src/auth/routes.ts
import { Router, type Request, type Response } from 'express';
import passport from './passport';
import { signJwt, verifyJwt } from './jwt';
import type { User } from '@prisma/client';

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
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx vitest run src/auth/__tests__/routes.test.ts
```
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/routes.ts backend/src/auth/__tests__/routes.test.ts
git commit -m "feat(backend): add auth routes (Google OAuth, /me, /logout)"
```

---

### Task 8: Wire up Express

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Replace index.ts**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

import authRouter from './auth/routes';

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'floorplan-ai-backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
```

Note: The `import authRouter` statement is placed after `dotenv.config()` and env validation so that Passport (which reads `GOOGLE_CLIENT_ID` at module load time) receives the correct values.

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run all backend tests**

```bash
cd backend && npx vitest run
```
Expected: jwt (4), middleware (3), routes (3) tests pass. The passport test requires live Postgres — skip with `--reporter=verbose` if Postgres is not running.

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(backend): wire cookieParser, credentialed CORS, env validation, auth router"
```

---

### Task 9: Frontend — install Vitest and testing-library

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Install testing packages**

Run in `frontend/`:
```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected: no errors.

- [ ] **Step 2: Create test setup file**

```typescript
// frontend/src/test/setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Update vite.config.ts**

Replace the entire file:
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Add test scripts to package.json**

In `frontend/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify vitest runs**

```bash
cd frontend && npx vitest run
```
Expected: "No test files found" (not an error).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test/setup.ts
git commit -m "chore(frontend): install vitest, testing-library, configure test env"
```

---

### Task 10: AuthContext

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/context/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/src/context/__tests__/AuthContext.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthContext';

function TestConsumer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>loading</div>;
  return <div>{isAuthenticated ? `hello ${user!.userId}` : 'not logged in'}</div>;
}

function wrap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </QueryClientProvider>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('AuthContext', () => {
  it('exposes user and isAuthenticated=true when /api/auth/me returns 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 'cuid_1', role: 'user' }),
    }));
    wrap();
    await waitFor(() => expect(screen.getByText('hello cuid_1')).toBeInTheDocument());
  });

  it('exposes isAuthenticated=false when /api/auth/me returns 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    wrap();
    await waitFor(() => expect(screen.getByText('not logged in')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/context/__tests__/AuthContext.test.tsx
```
Expected: FAIL — "Cannot find module '../AuthContext'"

- [ ] **Step 3: Implement AuthContext.tsx**

```typescript
// frontend/src/context/AuthContext.tsx
import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface User {
  userId: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

async function fetchMe(): Promise<User> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) throw new Error('unauthenticated');
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/context/__tests__/AuthContext.test.tsx
```
Expected: PASS — 2 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/context/__tests__/AuthContext.test.tsx
git commit -m "feat(frontend): add AuthContext with TanStack Query /auth/me session check"
```

---

### Task 11: ProtectedRoute

**Files:**
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/components/__tests__/ProtectedRoute.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/src/components/__tests__/ProtectedRoute.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthCtx from '../../context/AuthContext';

function wrap(overrides: Partial<ReturnType<typeof AuthCtx.useAuth>>) {
  vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    ...overrides,
  });
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('ProtectedRoute', () => {
  it('renders a spinner while loading', () => {
    wrap({ isLoading: true });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    wrap({ isLoading: false, isAuthenticated: false });
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).toBeNull();
  });

  it('renders children when authenticated', () => {
    wrap({ isLoading: false, isAuthenticated: true, user: { userId: 'cuid_1', role: 'user' } });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/components/__tests__/ProtectedRoute.test.tsx
```
Expected: FAIL — "Cannot find module '../ProtectedRoute'"

- [ ] **Step 3: Implement ProtectedRoute.tsx**

```typescript
// frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/components/__tests__/ProtectedRoute.test.tsx
```
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProtectedRoute.tsx frontend/src/components/__tests__/ProtectedRoute.test.tsx
git commit -m "feat(frontend): add ProtectedRoute component"
```

---

### Task 12: LoginPage

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/__tests__/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/src/pages/__tests__/LoginPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

function wrap(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renders the Sign in with Google link', () => {
    wrap();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('does not show an error message by default', () => {
    wrap();
    expect(screen.queryByText('Sign-in failed. Please try again.')).toBeNull();
  });

  it('shows error message when ?error=oauth_failed is present', () => {
    wrap('?error=oauth_failed');
    expect(screen.getByText('Sign-in failed. Please try again.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/pages/__tests__/LoginPage.test.tsx
```
Expected: FAIL — "Cannot find module '../LoginPage'"

- [ ] **Step 3: Implement LoginPage.tsx**

```typescript
// frontend/src/pages/LoginPage.tsx
import { useSearchParams } from 'react-router-dom';

export function LoginPage() {
  const [params] = useSearchParams();
  const hasOAuthError = params.get('error') === 'oauth_failed';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Floorplan AI</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">Design your dream HDB flat</p>
        {hasOAuthError && (
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">
            Sign-in failed. Please try again.
          </p>
        )}
        <a
          href="/api/auth/google"
          className="flex items-center justify-center w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-700 font-medium hover:bg-zinc-50 transition-colors"
        >
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
```

Note: `/api/auth/google` is a relative URL. In dev, the Vite proxy (`/api` → `http://backend:4000`) forwards it to the backend. In production, configure your reverse proxy the same way.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/pages/__tests__/LoginPage.test.tsx
```
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/pages/__tests__/LoginPage.test.tsx
git commit -m "feat(frontend): add LoginPage with Google OAuth link and error display"
```

---

### Task 13: Wire up App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">Floorplan AI</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Design your dream HDB flat</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npx vitest run
```
Expected: all tests pass (AuthContext×2, ProtectedRoute×3, LoginPage×3).

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): wire QueryClient, AuthProvider, ProtectedRoute into App"
```
