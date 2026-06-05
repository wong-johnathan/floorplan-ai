# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Floorplan AI is a Singapore-focused web app for HDB homeowners to design, visualize, and render interiors. The core workflow: **BTO selection → 2D floor plan editor → room labelling → AI design consultant → photorealistic renders**. The project is in early development (Phase 0 scaffold complete, entering Phase 1).

## Development Commands

### Frontend (`cd frontend`)
```bash
npm run dev          # Vite dev server → http://localhost:3000
npm run build        # tsc -b && vite build (production)
npm run lint         # ESLint (typescript-eslint + react-hooks)
npm run preview      # Vite preview of production build
```

### Backend (`cd backend`)
```bash
npm run dev          # nodemon + ts-node → http://localhost:4000
npm run build        # tsc → dist/
npm run start        # node dist/index.js (production)
npm run typecheck    # tsc --noEmit
```

### Docker (from repo root)
```bash
docker compose -f docker-compose.dev.yml up --build   # All services with hot reload
docker compose -f docker-compose.yml up --build       # Production-like
```

### No test framework is configured yet in either frontend or backend.

## Architecture

### Two separate npm packages (not a monorepo workspace)

```
floorplan-ai/
├── frontend/   # Vite + React 19 + TypeScript (ESM, bundler resolution)
├── backend/    # Express + TypeScript (CommonJS, ts-node in dev)
└── docs/       # PRD, architecture, UX, deployment, planning
```

### Frontend stack
- **Router:** React Router v7 (`BrowserRouter`)
- **State:** Zustand (client state) + TanStack Query (server state)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin
- **Import alias:** `@/*` → `./src/*` (configured in tsconfig paths + Vite)
- **Vite proxy:** `/api` requests in dev are proxied to `http://backend:4000` (Docker service name). When running manually, the proxy target needs to be `http://localhost:4000`.

### Backend stack
- Express with helmet, cors, morgan middleware
- PostgreSQL (`pg` driver) + Redis (`redis` driver) — Prisma is planned (Phase 0.6) but not yet configured
- No route modularization yet — everything is in `src/index.ts`

### Planned core subsystems (from docs/architecture.md)
1. **2D Floor Plan Editor** (react-konva) — the primary working canvas. Wall segments, shape placement, snap system (25cm grid), undo/redo.
2. **AI Design Consultant** — stateful chat agent keyed to room labels, maintains a Design Brief JSON.
3. **3D Rendering** (React Three Fiber) — final output, not the working canvas.
4. **Admin Panel** — BTO template system with wall annotation, auto room detection from wall enclosures.

### Environment files
- `.env.example` — template, checked into git
- `.env.dev` — local Docker development values
- `.env.local` — secrets/overrides (gitignored)
- `.env.production` — production values (gitignored)
- Frontend env var: `NEXT_PUBLIC_API_URL` (legacy name from Next.js migration, still in use)
- Backend env vars: `DATABASE_URL`, `REDIS_URL`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`

### Docker dev setup
Frontend and backend are built from `Dockerfile.dev` in each directory — they volume-mount `src/` for hot reload. Postgres 16 and Redis 7 run as stock Alpine images. The backend has a healthcheck dependency on Postgres.

### Implementation phases (from docs/planning.md)
| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Scaffold + infrastructure | Done |
| 1 | Admin panel + BTO templates (wall segments) | Next |
| 2 | 2D floor plan editor | Planned |
| 3 | Room demarking + labelling | Planned |
| 4 | AI design consultant | Planned |
| 5 | Photorealistic rendering (Gemini Imagen) | Planned |
| 6 | Gallery + sharing | Planned |
| 7 | Polish + mobile | Planned |
