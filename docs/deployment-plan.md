# Docker-Compose Deployment Plan

## HDB Interior Design Web App — Split Architecture

| Field | Value |
|-------|-------|
| **Status** | Planning Document v1.0 |
| **Date** | 2026-06-03 |
| **Author** | Hermes Agent |
| **Based on** | architecture.md, technical-specification.md, PRD.md, planning.md, wall-editing-architecture.md |

---

## 1. FEASIBILITY ASSESSMENT

### 1.1 Is the docker-compose architecture feasible?

**Yes, but with major architectural changes.** The current spec is a Next.js monolith (App Router serving both frontend and API routes). Splitting into separate frontend and backend services requires significant refactoring:

### 1.2 What Must Change from the Current Next.js-Only Plan

| Component | Current (Monolith) | Docker-Compose Split | Effort |
|-----------|-------------------|---------------------|--------|
| **API Routes** | Next.js API routes in `app/api/` | Separate Express/Fastify backend service | **High** — rewrite all route handlers |
| **Prisma** | `@prisma/client` in Next.js | Prisma runs in backend only | **Medium** — move schema + client |
| **NextAuth** | Handles sessions + JWT | Must switch to JWT-only (stateless) or proxy auth | **High** — NextAuth tightly coupled to Next.js |
| **R2 Signed URLs** | AWS SDK in API route | Backend generates signed URLs, frontend calls backend | **Low** — just move endpoint |
| **Gemini AI** | Called from API route | Backend calls Gemini, frontend calls backend | **Low** |
| **3D Rendering** | Client-side R3F (stays in browser) | No change — still client-side | **None** |
| **Floor Plan Editor** | Client-side react-konva (stays in browser) | No change — still client-side | **None** |
| **File Uploads** | Direct to R2 via signed URL | Frontend gets signed URL from backend → uploads to R2 directly | **Low** |
| **Deployment** | Vercel (single deploy) | Docker Compose on any host | New deployment infra needed |

### 1.3 What Stays the Same

- Client-side 3D (R3F + Three.js) — no server-side change
- Client-side floor plan editor (react-konva) — no change
- Client-side furniture drag system (Zustand + drei DragControls)
- Cloudflare R2 bucket structure
- Database schema (Prisma models)
- Gemini AI models and prompts

### 1.4 What Is Lost vs Vercel

| Vercel Feature | Docker Alternative |
|---------------|-------------------|
| Edge Functions (low-latency global) | Single-region server (e.g. Singapore) |
| Automatic CDN + caching | Nginx + Cloudflare R2 CDN |
| Preview Deploys per PR | Feature branches + docker-compose profiles |
| Serverless auto-scaling | Docker Swarm / K8s if needed |
| PgBouncer bundled with Supabase | PgBouncer sidecar or built-in pooling |

---

## 2. SERVICE BREAKDOWN

### 2.1 Service Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DOCKER NETWORK (hdb-net)                          │
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   nginx       │    │   frontend    │    │   backend     │               │
│  │   :80/:443    │───►│  Next.js SSR  │───►│  Express/Fastify             │
│  │  (reverse     │    │  :3000       │    │  :4000       │               │
│  │   proxy)      │    └──────────────┘    └──────┬───────┘               │
│  └──────────────┘                                │                        │
│        │                                         │                        │
│        ▼                                         ▼                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   External    │    │   postgres    │    │    redis      │               │
│  │   Services    │    │  PostgreSQL 16│    │   Redis 7     │               │
│  │               │    │  :5432       │    │  :6379        │               │
│  │  • Cloudflare │    └──────────────┘    └──────────────┘               │
│  │    R2         │                                                    │
│  │  • Google     │    ┌──────────────┐    ┌──────────────┐               │
│  │    Gemini API │    │  pgadmin      │    │  minio (R2   │               │
│  │  • Google     │    │  :5050       │    │   emulator)  │               │
│  │    OAuth      │    └──────────────┘    │  :9000/:9001 │               │
│  └──────────────┘                        └──────────────┘               │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Details

| Service | Image | Port(s) | Dependencies | Purpose |
|---------|-------|---------|-------------|---------|
| **nginx** | nginx:alpine | `80` (HTTP), `443` (HTTPS) | frontend, backend | Reverse proxy, SSL termination, static asset caching |
| **frontend** | Custom Dockerfile (Node 22) | `3000` | backend, redis | Next.js SSR app — UI, 3D viewport, floor plan editor |
| **backend** | Custom Dockerfile (Node 22) | `4000` | postgres, redis | Express/Fastify API — Prisma, Gemini proxy, R2 signed URLs |
| **postgres** | postgis/postgres:16-3.4 | `5432` | — | PostgreSQL 16 with PostGIS for spatial queries |
| **redis** | redis:7-alpine | `6379` | — | Rate limiting, session cache, BullMQ job queue (future) |
| **pgadmin** | dpage/pgadmin4 | `5050` | postgres | DB management UI (dev only) |
| **minio** | minio/minio | `9000` (API), `9001` (Console) | — | S3-compatible storage for R2 emulation (dev only) |

### 2.3 Tech Choices Per Service

#### Frontend Service
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16 (App Router) | SSR for landing, client routing for studio/edit |
| **React** | 19 | UI framework |
| **Three.js** | r172+ | 3D rendering (client-side only) |
| **@react-three/fiber** | 9.x | R3F canvas |
| **@react-three/drei** | 10.x | OrbitControls, DragControls |
| **react-konva** | 19.x | Floor plan editor canvas |
| **Zustand** | 5.x | Client state management |
| **shadcn/ui** | Latest | UI components |
| **Tailwind CSS** | 4.x | Styling |
| **next-auth** | 5.x | Auth client (JWT flow) |

**Key change:** No `@prisma/client`, no `@google/genai`, no `@aws-sdk/*` in frontend. All API calls go to backend at `/api/backend/...`.

#### Backend Service
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Express** or **Fastify** | Latest | HTTP API server |
| **Prisma** | 6.x | Database ORM + migrations |
| **@google/genai** | Latest | Gemini 2.5 Pro + Imagen client |
| **@aws-sdk/client-s3** | 3.x | Cloudflare R2 SDK |
| **@aws-sdk/s3-request-presigner** | 3.x | Signed URL generation |
| **next-auth** | 5.x | JWT validation + session management |
| **zod** | 3.x | Request validation |
| **nanoid** | 5.x | ID generation |
| **ioredis** | Latest | Redis client for rate limiting + caching |
| **bullmq** | Latest | Job queue for async render tasks (future) |

---

## 3. FOLDER STRUCTURE

```
interior-design/
├── docker-compose.yml              # Main compose file
├── docker-compose.dev.yml          # Dev overrides (hot reload, debug)
├── docker-compose.prod.yml         # Prod overrides (SSL, replicas)
├── .env.example                    # Template for all env vars
├── .env                            # Actual env vars (git-ignored)
│
├── frontend/
│   ├── Dockerfile                  # Multi-stage: deps → build → run
│   ├── .dockerignore
│   ├── nginx.conf                  # Frontend-specific nginx config
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   │
│   └── src/
│       ├── app/                    # Next.js App Router pages
│       │   ├── page.tsx            # Landing
│       │   ├── layout.tsx
│       │   ├── browse/
│       │   ├── studio/[id]/
│       │   ├── edit/[id]/
│       │   ├── share/[id]/
│       │   └── admin/
│       ├── components/
│       │   ├── ui/                 # shadcn/ui
│       │   ├── viewport/           # R3F scene
│       │   ├── flooreditor/        # react-konva editor
│       │   ├── consultant/         # Chat panel
│       │   ├── furniture/          # Furniture system
│       │   ├── renders/            # Render gallery
│       │   └── admin/              # Admin components
│       ├── lib/
│       │   ├── api-client.ts       # Fetch wrapper → backend
│       │   ├── mesh/               # Client-side mesh generation
│       │   ├── furniture/          # Drag, snap, collision
│       │   └── export/             # Collada/OBJ export
│       ├── stores/                 # Zustand stores
│       └── types/                  # Shared TypeScript types
│
├── backend/
│   ├── Dockerfile                  # Multi-stage: deps → build → run
│   ├── .dockerignore
│   ├── package.json
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── index.ts                # Express/Fastify app entry
│       ├── config/
│       │   ├── env.ts              # Zod-validated env vars
│       │   └── cors.ts             # CORS config
│       ├── routes/
│       │   ├── auth.ts             # NextAuth handlers proxy
│       │   ├── bto.ts              # BTO project CRUD
│       │   ├── models.ts           # Flat model CRUD
│       │   ├── projects.ts         # User project CRUD
│       │   ├── walls.ts            # Wall segment + room defs
│       │   ├── ai.ts               # Gemini consultant proxy
│       │   ├── render.ts           # Gemini Imagen proxy
│       │   ├── upload.ts           # R2 signed URLs
│       │   ├── export.ts           # Collada/OBJ generation
│       │   ├── furniture.ts        # Furniture templates + catalog
│       │   └── presets.ts          # Style presets
│       ├── middleware/
│       │   ├── auth.ts             # JWT verification
│       │   ├── rate-limit.ts       # Redis-based rate limiter
│       │   └── error-handler.ts    # Global error handling
│       ├── services/
│       │   ├── gemini.ts           # Gemini API client
│       │   ├── r2.ts               # R2 S3 client
│       │   └── redis.ts            # Redis client
│       ├── validators/
│       │   └── schemas.ts          # Zod schemas
│       └── types/
│           └── index.ts            # Shared types (mirrored from frontend)
│
├── db/
│   ├── init/
│   │   └── 01-extensions.sql      # PostGIS, uuid-ossp, pg_trgm extensions
│   ├── prisma/
│   │   └── schema.prisma           # Prisma schema (same as original)
│   └── migrations/                 # Prisma migration files
│
├── redis/
│   └── redis.conf                  # Custom Redis config (optional)
│
├── nginx/
│   ├── nginx.conf                  # Main nginx config
│   ├── conf.d/
│   │   ├── default.conf           # Site config
│   │   └── ssl.conf               # SSL config (prod only)
│   └── ssl/                        # SSL certs (git-ignored)
│
└── scripts/
    ├── setup.sh                    # Initial setup script
    ├── seed.ts                     # Seed DB with sample data
    └── healthcheck.sh              # Health check script
```

---

## 4. DOCKER-COMPOSE STRUCTURE

### 4.1 docker-compose.yml

```yaml
version: "3.9"

name: hdb-interior-design

networks:
  hdb-net:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  minio-data:
  pgadmin-data:

services:
  # ─── Reverse Proxy ──────────────────────────────────────────────
  nginx:
    image: nginx:alpine
    container_name: hdb-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - frontend-next-static:/app/frontend/.next:ro  # For static assets
    depends_on:
      - frontend
      - backend
    networks:
      - hdb-net
    restart: unless-stopped

  # ─── Frontend (Next.js SSR) ────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runner  # Multi-stage build
    container_name: hdb-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - NEXT_PUBLIC_API_URL=http://backend:4000/api
      - NEXT_PUBLIC_APP_URL=${APP_URL:-http://localhost}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${APP_URL:-http://localhost}
      - AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
      - AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
      - BACKEND_INTERNAL_URL=http://backend:4000  # For server-side API calls
    volumes:
      - frontend-next-static:/app/.next  # Share static build output with nginx
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - hdb-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  # ─── Backend (Express API) ──────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: runner
    container_name: hdb-backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
      - DIRECT_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - R2_ACCOUNT_ID=${R2_ACCOUNT_ID}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_BUCKET_NAME=${R2_BUCKET_NAME:-hdb-interior-design}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - AUTH_GOOGLE_ID=${AUTH_GOOGLE_ID}
      - AUTH_GOOGLE_SECRET=${AUTH_GOOGLE_SECRET}
      - CORS_ORIGIN=${APP_URL:-http://localhost}
      - PORT=4000
    volumes:
      - ./db/prisma:/app/prisma:ro  # Prisma schema + migrations
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - hdb-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ─── PostgreSQL ─────────────────────────────────────────────────
  postgres:
    image: postgis/postgis:16-3.4
    container_name: hdb-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${DB_USER:-hdb_app}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-changeme}
      - POSTGRES_DB=${DB_NAME:-hdb_interior_design}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --locale=C
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro  # Extensions setup
    networks:
      - hdb-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-hdb_app} -d ${DB_NAME:-hdb_interior_design}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 256M

  # ─── Redis ───────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: hdb-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    networks:
      - hdb-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # ─── MinIO (R2 Emulator — Dev Only) ─────────────────────────────
  minio:
    image: minio/minio
    container_name: hdb-minio
    profiles: ["dev"]
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Console
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - hdb-net

  # ─── pgAdmin (Dev Only) ──────────────────────────────────────────
  pgadmin:
    image: dpage/pgadmin4
    container_name: hdb-pgadmin
    profiles: ["dev"]
    ports:
      - "5050:80"
    environment:
      - PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL:-admin@hdb.com}
      - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD:-admin}
    volumes:
      - pgadmin-data:/var/lib/pgadmin
    depends_on:
      - postgres
    networks:
      - hdb-net

volumes:
  frontend-next-static:
```

### 4.2 docker-compose.dev.yml (Overrides)

```yaml
version: "3.9"

services:
  frontend:
    build:
      target: development  # Dev stage includes hot reload
    volumes:
      - ./frontend/src:/app/src:delegated
      - ./frontend/public:/app/public:delegated
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:4000/api
      - NEXTAUTH_URL=http://localhost:3000
      - WATCHPACK_POLLING=true  # For file watching in Docker
    command: ["npm", "run", "dev"]

  backend:
    build:
      target: development
    volumes:
      - ./backend/src:/app/src:delegated
      - ./backend/prisma:/app/prisma:delegated
    environment:
      - NODE_ENV=development
      - CORS_ORIGIN=http://localhost:3000
      - LOG_LEVEL=debug
    command: ["npm", "run", "dev"]

  postgres:
    ports:
      - "5432:5432"  # Expose for local dev tools

  redis:
    ports:
      - "6379:6379"

  # Dev-only services enabled
  minio:
    profiles: ["dev"]
  pgadmin:
    profiles: ["dev"]
```

### 4.3 docker-compose.prod.yml (Overrides)

```yaml
version: "3.9"

services:
  nginx:
    volumes:
      - ./nginx/conf.d/default.prod.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/nginx/ssl:ro  # Real SSL certs
    ports:
      - "80:80"
      - "443:443"

  frontend:
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      replicas: 2  # Scale horizontally
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  backend:
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
    # Consider managed DB (RDS, Supabase) in production instead
```

### 4.4 Environment Variables (.env.example)

```bash
# === General ===
NODE_ENV=production
APP_URL=http://localhost

# === Database ===
DB_USER=hdb_app
DB_PASSWORD=changeme
DB_NAME=hdb_interior_design

# === Redis ===
REDIS_URL=redis://redis:6379

# === Gemini AI ===
GEMINI_API_KEY=AIzaSy...

# === Cloudflare R2 ===
R2_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=abc123
R2_SECRET_ACCESS_KEY=xyz789
R2_BUCKET_NAME=hdb-interior-design

# === NextAuth (JWT-based) ===
NEXTAUTH_SECRET=your-generated-secret-min-32-chars
AUTH_GOOGLE_ID=abc123.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-...

# === MinIO (Dev Only) ===
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# === pgAdmin (Dev Only) ===
PGADMIN_EMAIL=admin@hdb.com
PGADMIN_PASSWORD=admin
```

---

## 5. DOCKERFILE DESIGNS

### 5.1 frontend/Dockerfile

```dockerfile
# ─── Base Stage ───────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── Dependencies Stage ───────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Development Stage ────────────────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

# ─── Build Stage ──────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm run build

# ─── Production Runner ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### 5.2 backend/Dockerfile

```dockerfile
# ─── Base Stage ───────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── Dependencies Stage ───────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Development Stage ────────────────────────────────────────────
FROM deps AS development
COPY . .
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 4000
CMD ["pnpm", "run", "dev"]

# ─── Build Stage ──────────────────────────────────────────────────
FROM deps AS builder
COPY . .
COPY prisma ./prisma
RUN npx prisma generate
RUN pnpm run build

# ─── Production Runner ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 appuser
RUN adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

USER appuser
EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/index.js"]
```

---

## 6. NGINX CONFIGURATION

### 6.1 nginx/nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    include /etc/nginx/conf.d/*.conf;
}
```

### 6.2 nginx/conf.d/default.conf

```nginx
upstream frontend {
    server frontend:3000;
    keepalive 64;
}

upstream backend {
    server backend:4000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    # SSL (prod) — use self-signed for dev
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ─── Static Assets Cache ──────────────────────────────────
    location /_next/static {
        proxy_pass http://frontend;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    location /static {
        proxy_pass http://frontend;
        proxy_cache_valid 200 1y;
    }

    # ─── WebSocket for potential future use ────────────────────
    location /_next/webpack-hmr {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # ─── API Backend ───────────────────────────────────────────
    location /api/ {
        # Strip /api prefix or keep it — backend expects /api
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # No caching for API
        add_header Cache-Control "no-store";
        proxy_cache off;

        # Timeouts for AI endpoints
        proxy_read_timeout 60s;
        proxy_send_timeout 30s;

        # Large body for render requests
        client_max_body_size 50M;
    }

    # ─── Frontend (Everything Else) ────────────────────────────
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 7. BUILD ORDER

### Phase 1: Infrastructure (Build First)

```mermaid
graph LR
    A[postgres] --> B[redis]
    B --> C[backend build]
    A --> C
    C --> D[frontend build]
    C --> E[nginx config]
    D --> E
    E --> F[Full System]
```

| Order | Service | Why First | Estimated Time |
|-------|---------|-----------|----------------|
| **1** | `postgres` | Database must be ready before backend can run migrations | 30s pull + 15s init |
| **2** | `redis` | No dependencies, fast | 10s pull |
| **3** | `backend` image build | Need Prisma client generate + compile TypeScript | 2-5 min (first time) |
| **4** | Backend container start | Runs DB migrations on startup, then starts listening | 10s |
| **5** | `frontend` image build | Next.js build depends on backend being alive for data fetching | 3-8 min (first time) |
| **6** | Frontend container start | SSR ready | 5s |
| **7** | `nginx` | Reverse proxy config last, depends on both services healthy | 10s |

### Phase 2: First-Time Setup Script

```bash
#!/bin/bash
# scripts/setup.sh

set -e

echo "=== HDB Interior Design — Docker Setup ==="

# 1. Copy env file if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example — edit it with real values!"
fi

# 2. Generate NextAuth secret
if grep -q "your-generated-secret" .env; then
    SECRET=$(openssl rand -base64 32)
    sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$SECRET/" .env
    echo "Generated NEXTAUTH_SECRET"
fi

# 3. Generate self-signed SSL certs for dev
if [ ! -f nginx/ssl/cert.pem ]; then
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/CN=localhost"
    echo "Generated self-signed SSL cert for localhost"
fi

# 4. Pull images and build
echo "Building images..."
docker compose build

# 5. Start infrastructure first
echo "Starting DB and Redis..."
docker compose up -d postgres redis
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# 6. Run migrations
echo "Running Prisma migrations..."
docker compose run --rm backend npx prisma migrate deploy

# 7. Seed database (optional)
echo "Seed database? (y/n)"
read -r SEED
if [ "$SEED" = "y" ]; then
    docker compose run --rm backend npx prisma db seed
fi

# 8. Start everything
echo "Starting all services..."
docker compose up -d

echo "=== Setup Complete ==="
echo "Frontend: https://localhost"
echo "Backend API: https://localhost/api"
echo "pgAdmin (dev): http://localhost:5050"
echo "MinIO Console (dev): http://localhost:9001"
```

---

## 8. API ROUTING PLAN (Frontend → Backend)

### 8.1 Request Flow

```
Browser ──► nginx (:80/:443)
               │
               ├── /_next/static/*  ──► frontend:3000 (cached)
               ├── /api/*            ──► backend:4000  (proxied)
               └── /*                ──► frontend:3000 (SSR)
```

### 8.2 Frontend API Client

```typescript
// frontend/src/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",  // Forward cookies for auth
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new ApiError(res.status, error.message);
    }

    return res.json();
  }

  // ─── Auth ──────────────────────────────────────────────────
  async login(provider: string) { window.location.href = `${API_BASE}/auth/${provider}`; }
  async session() { return this.request<Session>("/auth/session"); }

  // ─── BTO Projects ──────────────────────────────────────────
  async getBTOProjects() { return this.request<BTOProject[]>("/bto"); }
  async getFlatModel(id: string) { return this.request<FlatModel>(`/models/${id}/walls`); }

  // ─── User Projects ─────────────────────────────────────────
  async createProject(data: CreateProjectDTO) { return this.request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }); }
  async getProject(id: string) { return this.request<Project>(`/projects/${id}`); }
  async saveWallEdits(id: string, edits: WallEdit[]) {
    return this.request(`/projects/${id}/walls`, { method: "PUT", body: JSON.stringify(edits) });
  }

  // ─── AI Consultant ─────────────────────────────────────────
  async consult(projectId: string, message: string) {
    return this.request<ConsultResponse>("/ai/consult", {
      method: "POST",
      body: JSON.stringify({ projectId, message }),
    });
  }

  // ─── Renders ───────────────────────────────────────────────
  async triggerRender(projectId: string, roomType: string) {
    return this.request<RenderResponse>("/render/sample", {
      method: "POST",
      body: JSON.stringify({ projectId, roomType }),
    });
  }

  // ─── Upload ────────────────────────────────────────────────
  async getUploadUrl(filename: string, contentType: string) {
    return this.request<{ url: string; key: string }>("/upload", {
      method: "POST",
      body: JSON.stringify({ filename, contentType }),
    });
  }

  // ─── Furniture ─────────────────────────────────────────────
  async getTemplates(roomType?: string, styleTag?: string) {
    const params = new URLSearchParams();
    if (roomType) params.set("roomType", roomType);
    if (styleTag) params.set("styleTag", styleTag);
    return this.request<FurnitureTemplate[]>(`/furniture/templates?${params}`);
  }
}
```

### 8.3 NextAuth Configuration (Split Architecture)

```typescript
// frontend/src/app/api/auth/[...nextauth]/route.ts
// This remains to handle OAuth callbacks locally,
// but validates sessions against the backend

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",  // Stateless — no DB calls from frontend
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // On sign-in, validate with backend
        const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            idToken: account.id_token,
          }),
        });
        const user = await response.json();
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

---

## 9. DATABASE INITIALIZATION

### 9.1 db/init/01-extensions.sql

```sql
-- Run on first container start
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- For spatial room queries
```

### 9.2 Prisma Migration Strategy

```
backend/Dockerfile startup:
  1. Wait for PostgreSQL to be healthy
  2. Run: npx prisma migrate deploy
  3. If first run, optionally seed: npx prisma db seed
  4. Start API server

This ensures the schema is always up-to-date when the backend starts.
```

---

## 10. REDIS USAGE

```typescript
// backend/src/services/redis.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://redis:6379");

// ─── Rate Limiting ───────────────────────────────────────────────
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}

// ─── Session Cache ────────────────────────────────────────────────
export async function cacheSession(userId: string, data: any, ttl = 3600) {
  await redis.setex(`session:${userId}`, ttl, JSON.stringify(data));
}

export async function getCachedSession(userId: string) {
  const data = await redis.get(`session:${userId}`);
  return data ? JSON.parse(data) : null;
}

// ─── BullMQ Queue (Future — Batch Renders) ───────────────────────
export const renderQueue = new Queue("render-jobs", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});
```

---

## 11. RISKS & MITIGATIONS

### 11.1 High Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **NextAuth in split architecture** fails | High | High — auth breaks | Use JWT strategy (no DB adapter for frontend). Backend validates tokens via API endpoint. Test all auth flows in CI. |
| **CORS issues between frontend/backend** | High | Medium — API calls fail | Use nginx reverse proxy (same-origin). Backend sets `CORS_ORIGIN` to frontend URL as fallback. |
| **Next.js SSR fetches timing out** on backend startup | Medium | High — first page load fails | Add retry logic in `getServerSideProps`/server components. Docker health checks ensure backend is ready before frontend starts. |
| **Prisma migrations run twice** (both services) | Medium | Medium — migration conflicts | Only backend runs migrations. Frontend has no Prisma. Migration runs in a startup script, not on every deploy. |

### 11.2 Medium Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Static asset caching** wrong in nginx | Medium | Low — stale CSS/JS | Use content-hashed filenames (Next.js default). Set immutable cache headers. |
| **Gemini API latency** backend → Gemini → backend → frontend | Medium | Low — slow chat | Use streaming response (SSE) from backend to frontend. Backend streams Gemini response chunks directly. |
| **MinIO vs real R2 differences** in dev | Medium | Low — signed URL format diff | Abstract S3 client behind interface. Swap implementations via env var. |
| **WebSocket for HMR** blocked by nginx | Medium | Low — dev DX degrades | Add WebSocket upgrade headers in dev nginx config. |
| **File upload size limits** | Low | Medium — large floor plans rejected | nginx `client_max_body_size 50M`. Backend validates file size before generating signed URL. |

### 11.3 Low Risk

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Docker image sizes too large | Low | Medium — slow deploys | Multi-stage builds. Alpine-based images. Next.js output: standalone. |
| PostgreSQL memory exhaustion | Low | High — DB crashes | Set Docker memory limits (1GB default). Add PgBouncer sidecar if needed. |
| Redis data loss on restart | Low | Low — rate limit counters reset | Redis AOF persistence enabled. Session cache is ephemeral (re-fetched from DB). |
| SSL cert expiration | Low | High — site inaccessible | Use Let's Encrypt with certbot auto-renewal. Add cron job inside nginx container. |

### 11.4 Architecture-Specific Risks

| Risk | Detail | Mitigation |
|------|--------|------------|
| **Frontend SSR needs to call backend** for page data | Server Components fetch during render. If backend is slow, page load suffers | Use React Server Components with streaming Suspense boundaries. Cache BTO project data in Redis (1h TTL). |
| **OAuth callback URL mismatch** | Google OAuth redirects to `NEXTAUTH_URL`. In docker, this must be the public URL (not localhost:3000) | Set `NEXTAUTH_URL` to the nginx public URL. Use environment-specific callback URLs. |
| **File upload signed URL domain mismatch** | R2 signed URLs include the R2 endpoint. CORS must allow cross-origin fetches from the app domain | Add R2 public URL to CSP `connect-src`. Ensure R2 bucket CORS policy allows the app origin. |

---

## 12. MIGRATION PATH FROM NEXT.JS MONOLITH

### Stage 1: Extract Backend (Week 1-2)

1. Create `backend/` folder, copy all `app/api/` routes
2. Refactor route handlers into Express/Fastify format
3. Set up Prisma in backend, remove from frontend
4. Create API client in frontend pointing to backend
5. Keep NextAuth in frontend for OAuth, add backend validation endpoint

### Stage 2: Dockerize (Week 2-3)

1. Write Dockerfiles for frontend and backend
2. Write docker-compose.yml with postgres, redis, nginx
3. Configure nginx reverse proxy
4. Test full flow: browser → nginx → frontend/backend

### Stage 3: Productionize (Week 3-4)

1. Add SSL certs
2. Set up CI/CD (GitHub Actions → Docker build → deploy)
3. Configure monitoring (health checks, logging)
4. Load test with k6

---

## 13. SUMMARY

| Aspect | Assessment |
|--------|-----------|
| **Feasibility** | ✅ Feasible with significant refactoring. Split architecture introduces CORS, auth, and deployment complexity not present in the Vercel monolith. |
| **Services** | 6 core services: nginx, frontend (Next.js SSR), backend (Express/Fastify), PostgreSQL 16, Redis 7, plus optional dev tools (MinIO, pgAdmin). |
| **Ports** | nginx: 80/443, frontend: 3000, backend: 4000, postgres: 5432, redis: 6379 |
| **Build Time** | ~10-15 min first build (image pulls + Next.js build + TypeScript compile), ~2-3 min subsequent |
| **Key Changes** | NextAuth JWT strategy, Prisma moved to backend, all API calls proxied through nginx, no serverless Deploy |
| **Trade-off** | More infrastructure complexity but full control over deployment, no Vercel vendor lock-in, supports self-hosting or any VPS |
