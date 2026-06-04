# Floor Plan AI — HDB Interior Design Studio

A Singapore-focused web app for HDB homeowners to design, visualize, and render their dream interiors.

## Architecture

```
floorplan-ai/
├── frontend/          # Vite + React 19 + TypeScript + Tailwind CSS v4
├── backend/           # Express + TypeScript API server
├── docker-compose.yml # Local development orchestration
├── docs/              # PRD, architecture, planning docs
└── README.md
```

## Quick Start (Docker — recommended)

```bash
docker compose -f docker-compose.dev.yml up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Postgres: localhost:5432
# Redis:    localhost:6379
```

## Quick Start (Manual)

```bash
# Frontend
cd frontend
npm install
npm run dev          # → http://localhost:3000

# Backend (separate terminal)
cd backend
npm install
npm run dev          # → http://localhost:4000
```

## Services

| Service | Port | Tech |
|---------|------|------|
| Frontend | 3000 | Vite, React 19, TypeScript, Tailwind CSS v4 |
| Backend | 4000 | Express, TypeScript, PostgreSQL, Redis |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching, queues |
