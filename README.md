# Floor Plan AI — HDB Interior Design Studio

A Singapore-focused web app for HDB homeowners to design, visualize, and render their dream interiors.

## Architecture

```
floorplan-ai/
├── frontend/          # Next.js 16 + TypeScript + Tailwind CSS
├── backend/           # Express + TypeScript API server
├── docker-compose.yml # Production orchestration
├── docs/              # PRD, architecture, planning docs
└── README.md
```

## Quick Start (Development)

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

## Quick Start (Docker)

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Postgres: localhost:5432
# Redis:    localhost:6379
```

## Services

| Service | Port | Tech |
|---------|------|------|
| Frontend | 3000 | Next.js 16, TypeScript, Tailwind CSS v4, react-konva |
| Backend | 4000 | Express, TypeScript, PostgreSQL, Redis |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Sessions, caching, queues |
