# Authentication System Design

**Date:** 2026-06-04  
**Status:** Approved  
**Scope:** Google OAuth login flow, JWT issuance via HTTP-only cookie, frontend auth guard

---

## 1. Backend Architecture

Passport.js with `passport-google-oauth20` strategy added to the bare Express server.

**Auth routes (`/api/auth/*`):**

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/google` | GET | Redirects to Google consent screen |
| `/api/auth/google/callback` | GET | OAuth exchange; upsert user; set cookie; redirect to frontend |
| `/api/auth/me` | GET | Verify cookie JWT; return user object or 401 |
| `/api/auth/logout` | POST | Clear cookie; return 200 |

**Strategy callback logic:**
1. Receive Google profile from Passport
2. `findFirst` User by `googleId`; create if not found (upsert)
3. Sign JWT `{ userId, role }` with `JWT_SECRET` from env
4. Set cookie: `HttpOnly`, `SameSite=Strict`, `Secure` in prod
5. Redirect `302` to `http://localhost:3000/`

**`requireAuth` middleware:** Reads cookie, verifies JWT, attaches `req.user = { userId, role }`. Applied to all protected API routes.

**CORS:** `{ origin: "http://localhost:3000", credentials: true }`.

No session store. Stateless JWT. No secrets hardcoded — all from environment variables.

---

## 2. Database

Prisma `User` model:

```prisma
model User {
  id        String   @id @default(cuid())
  googleId  String   @unique
  email     String   @unique
  name      String
  avatarUrl String?
  role      String   @default("user")  // "user" | "admin"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Admin access granted by setting `role = "admin"` in the DB directly. No separate admin login.

---

## 3. Frontend Architecture

**`AuthContext`:** Calls `GET /api/auth/me` on mount via TanStack Query. Exposes `{ user, isLoading, isAuthenticated }`. User shape: `{ id, email, name, avatarUrl, role }`.

**`ProtectedRoute`:** Wraps routes requiring login. Shows spinner while loading; redirects to `/login` if unauthenticated; renders children if authenticated.

**`LoginPage`:** Single centered card with "Sign in with Google" button. Button performs a full browser navigation to `http://localhost:4000/api/auth/google` (not a fetch — the browser must follow the OAuth redirect chain). After callback, backend redirects to `http://localhost:3000/` and the cookie is set automatically.

**Route structure:**
```
/        → ProtectedRoute → Home (placeholder)
/login   → LoginPage
```

All API calls use `credentials: "include"`. The frontend never handles tokens directly.

---

## 4. Data Flow

### Login
```
User clicks "Sign in with Google"
  → browser navigates to GET /api/auth/google
  → Passport redirects to accounts.google.com
  → user consents
  → Google redirects to GET /api/auth/google/callback?code=...
  → Passport exchanges code for profile
  → strategy callback: upsert User in Postgres
  → sign JWT { userId, role }, set HttpOnly cookie
  → redirect 302 to http://localhost:3000/
  → AuthContext calls GET /api/auth/me (cookie sent automatically)
  → /auth/me verifies JWT, returns user object
  → app renders authenticated
```

### Logout
```
User clicks logout
  → POST /api/auth/logout
  → backend clears cookie
  → AuthContext invalidates /auth/me query → user = null → redirect to /login
```

### Page load (returning user)
```
App mounts → AuthContext calls /auth/me
  → valid cookie: restore session silently
  → missing/expired cookie: redirect to /login
```

---

## 5. Error Handling

**Backend:**
- OAuth failure (denied consent, network error) → redirect to `http://localhost:3000/login?error=oauth_failed`
- JWT verify failure → 401 `{ error: "unauthorized" }`
- JWT sign failure → 500 (logged server-side, not exposed to client)
- DB upsert failure → 500, generic message, no user data leaked
- Missing env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`) → server fails fast at startup with explicit log

**Frontend:**
- `/auth/me` returns 401 on load → `ProtectedRoute` redirects to `/login`
- `/auth/me` returns 401 mid-session → TanStack Query error triggers same redirect
- `?error=oauth_failed` on `/login` → inline error: "Sign-in failed. Please try again."
- Network error on `/auth/me` → treated as unauthenticated (fail closed)

No auth errors swallowed silently. No stack traces in API responses.

---

## 6. Testing

**Backend (Vitest + Supertest):**
- `GET /api/auth/me` with valid cookie → 200 + user object
- `GET /api/auth/me` with missing/expired cookie → 401
- `POST /api/auth/logout` → cookie cleared, 200
- `requireAuth` middleware → blocks unauthenticated, passes authenticated
- Strategy callback → creates new user on first login; reuses existing user on second login (real test DB, not mocked Prisma)

**Frontend (Vitest + React Testing Library):**
- `AuthContext` → renders children when authenticated; redirects to `/login` when not
- `ProtectedRoute` → spinner while loading; redirects on 401; renders on 200
- `LoginPage` → renders button; click navigates to `/api/auth/google`

Unit tests only for pure helpers (JWT sign/verify utility). Integration tests cover the full auth path against a real test DB.

---

## 7. Required Environment Variables

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
```

To be added to `backend/.env.example`, `.env.dev`, and `.env.local`.

---

## 8. Files to Create / Modify

| File | Action |
|------|--------|
| `backend/src/auth/passport.ts` | New — Passport strategy setup |
| `backend/src/auth/middleware.ts` | New — `requireAuth` middleware |
| `backend/src/auth/routes.ts` | New — auth route handlers |
| `backend/src/index.ts` | Modify — wire CORS credentials, mount auth router |
| `backend/prisma/schema.prisma` | New — User model |
| `backend/.env.example` | Modify — add Google OAuth + JWT vars |
| `frontend/src/context/AuthContext.tsx` | New — auth context + provider |
| `frontend/src/components/ProtectedRoute.tsx` | New — route guard |
| `frontend/src/pages/LoginPage.tsx` | New — login UI |
| `frontend/src/App.tsx` | Modify — wrap routes with AuthProvider + ProtectedRoute |
