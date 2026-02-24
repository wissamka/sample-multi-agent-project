# Architecture Document (ARCH.md)

> **Project:** Task Management API & Web App
> **Version:** 1.0.0
> **Author:** Architect Agent
> **Status:** Approved
> **Date:** 2026-02-23

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                          Client                             │
│          React SPA (Kanban UI)  ·  /src/client              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / REST JSON
┌──────────────────────▼──────────────────────────────────────┐
│                       API Server                            │
│          Node.js + Express  ·  /src/server                  │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Auth Router │  │ Tasks Router │  │  Middleware       │   │
│  │ /auth/*     │  │ /tasks/*     │  │  JWT validation  │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────────────┘   │
└─────────┼────────────────┼────────────────────────────────--┘
          │                │
┌─────────▼────────────────▼──────────────────────────────────┐
│                      PostgreSQL                              │
│          users table  ·  tasks table  ·  /src/db            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| Frontend | React 18 + TypeScript | Component model fits kanban cards; TS enforces contract types |
| Frontend State | React Query (TanStack) | Server-state caching; optimistic updates for drag-and-drop |
| Frontend DnD | @dnd-kit/core | Accessible drag-and-drop; pointer + keyboard + touch support |
| Frontend Styling | Tailwind CSS | Utility-first; rapid kanban layout with flex/grid |
| Backend Runtime | Node.js 20 (LTS) | Ubiquitous, vast ecosystem, native TS support via tsx |
| Backend Framework | Express 4 | Minimal, well-understood; no magic routing |
| Auth | jsonwebtoken (HS256) + bcryptjs | Industry-standard JWT; bcrypt for password hashing |
| Validation | Zod | Schema-first validation shared between request parsing and TS types |
| Database | PostgreSQL 15 | ACID-compliant; strong typing; row-level ownership queries |
| DB Client | node-postgres (pg) | Lightweight, no ORM magic; SQL stays readable |
| DB Migrations | node-pg-migrate | Simple migration files; version-controlled schema |
| Testing (API) | Vitest + Supertest | Fast unit/integration; zero config with TS |
| Testing (UI) | Vitest + React Testing Library | Component testing aligned with user behaviour |
| Monorepo | npm workspaces | Shared types package without a full build tool |

---

## 3. Directory Structure

```
/
├── PRD.md
├── ARCH.md
├── CONTRACTS.md
├── package.json              # workspace root
├── src/
│   ├── server/               # Engineer_Alpha — backend scope
│   │   ├── index.ts          # Express app entry
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   └── tasks.ts
│   │   ├── middleware/
│   │   │   └── authenticate.ts
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   └── migrations/
│   │   └── schemas/          # Zod schemas (server-side)
│   ├── client/               # Engineer_Beta — frontend scope
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   └── Board.tsx
│   │   │   ├── components/
│   │   │   │   ├── KanbanBoard.tsx
│   │   │   │   ├── KanbanColumn.tsx
│   │   │   │   └── TaskCard.tsx
│   │   │   └── api/          # fetch wrappers (typed via CONTRACTS.md)
│   └── shared/               # Shared TypeScript types (read-only for both engineers)
│       └── types.ts
├── tests/
│   ├── server/
│   └── client/
└── docs/
```

---

## 4. Data Model

### `users` table

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,            -- bcrypt hash
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `tasks` table

```sql
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in-progress', 'done')),
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
```

---

## 5. Data Flow

### Authentication Flow

```
Client                          Server                         DB
  │                               │                             │
  │── POST /auth/register ────────►│                             │
  │   { email, password }         │── INSERT users ────────────►│
  │                               │◄─ user.id ──────────────────│
  │◄─ 201 { token: JWT } ─────────│                             │
  │                               │                             │
  │── POST /auth/login ───────────►│                             │
  │   { email, password }         │── SELECT users WHERE email ►│
  │                               │◄─ user row ─────────────────│
  │                               │   bcrypt.compare()          │
  │◄─ 200 { token: JWT } ─────────│                             │
```

### Authenticated Task Request Flow

```
Client                          Server                         DB
  │                               │                             │
  │── GET /tasks ─────────────────►│                             │
  │   Authorization: Bearer <JWT> │   JWT verify()              │
  │                               │── SELECT tasks WHERE        │
  │                               │   user_id = jwt.sub ───────►│
  │◄─ 200 { tasks: [...] } ────────│◄─ rows ─────────────────────│
```

---

## 6. Security Considerations

| Concern | Mitigation |
| :--- | :--- |
| Password storage | bcrypt with cost factor ≥ 10 |
| Session forgery | HS256 JWT signed with `JWT_SECRET` env var (≥ 32 random bytes) |
| Token expiry | Access tokens expire in 24h |
| Authorization | Every task query filters by `user_id = jwt.sub`; 403 on mismatch |
| SQL injection | Parameterized queries only (`$1`, `$2` placeholders) |
| Input validation | Zod schemas validate all request bodies before DB queries |
| CORS | Restrict `Access-Control-Allow-Origin` to the known client origin |
| Secrets | `JWT_SECRET`, `DATABASE_URL` injected via environment variables, never committed |

---

## 7. API Design Principles

- RESTful resource-oriented routing (`/tasks`, `/tasks/:id`)
- JSON request and response bodies
- HTTP status codes follow RFC 9110 (200, 201, 204, 400, 401, 403, 409, 422, 500)
- `PATCH` for partial updates (not `PUT`)
- All error responses use a consistent `{ error: string }` envelope

---

## 8. Deployment Topology

```
┌───────────────────────────────────────────────────────────┐
│  Host machine / Docker Compose (local dev & CI)           │
│                                                           │
│  ┌────────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │  React SPA     │    │  Express API │    │ Postgres │  │
│  │  (Vite / 5173) │───►│  (port 3000) │───►│ (5432)   │  │
│  └────────────────┘    └──────────────┘    └──────────┘  │
└───────────────────────────────────────────────────────────┘
```

- **Local dev:** `docker compose up` starts Postgres; `npm run dev` starts API + Vite concurrently.
- **CI:** GitHub Actions runs `npm test` (Vitest) on every PR.
- **Production:** Out of scope for Phase 1 — static SPA can be served from any CDN; API deployed as a container.

---

## 9. Engineer Scope Boundaries

| Engineer | Writable Scope | Read-Only |
| :--- | :--- | :--- |
| Engineer_Alpha | `/src/server`, `/src/shared/types.ts` (additive only) | `/src/client` |
| Engineer_Beta | `/src/client` | `/src/server`, `/src/shared/types.ts` |

Both engineers must treat `CONTRACTS.md` as immutable during Phase 2. Contract-change requests must go through the Architect.
