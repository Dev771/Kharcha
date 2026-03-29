# EXECUTION-PLAN.md — Kharcha (खर्चा)

**Generated:** 2026-03-28
**Updated:** 2026-03-29
**Source:** `docs/PRD.md` v1.0, `docs/TECH_SPEC.md` v1.0
**Overrides applied:** Turborepo monorepo, NextAuth v5 (no Keycloak), plain Docker Postgres + Redis (not Supabase), no deployment, solo dev, `client`/`server`/`shared` naming

---

## 0. Quick Start — Setup & Run Commands

### Prerequisites

- **Node.js** 20+ (`node -v`)
- **pnpm** 9+ (`pnpm -v` — install: `npm install -g pnpm@9`)
- **Docker Desktop** running (`docker info`)
- **Git** (`git --version`)

### First-Time Setup

```bash
# 1. Clone and install
git clone <repo-url> kharcha && cd kharcha
pnpm install

# 2. Environment
cp .env.example .env

# 3. Start infrastructure (Postgres + Redis)
docker run -d --name kharcha-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 54322:5432 \
  postgres:17-alpine

docker run -d --name kharcha-redis \
  -p 6379:6379 \
  redis:7-alpine

# 4. Verify infra
docker exec kharcha-postgres pg_isready -U postgres   # → "accepting connections"
docker exec kharcha-redis redis-cli ping               # → "PONG"

# 5. Run database migrations + seed (after Phase 1)
pnpm --filter @kharcha/server exec prisma migrate dev
pnpm --filter @kharcha/server exec prisma db seed

# 6. Build shared package (must build before running apps)
pnpm turbo build --filter=@kharcha/shared

# 7. Start development servers
pnpm turbo dev
```

### Daily Development

```bash
# Start infra (if stopped after reboot)
docker start kharcha-postgres kharcha-redis

# Start all dev servers (client on :3000, server on :3001)
pnpm turbo dev

# Or start individually:
pnpm --filter @kharcha/client dev    # Next.js on http://localhost:3000
pnpm --filter @kharcha/server dev    # NestJS on http://localhost:3001
```

### Common Commands

```bash
# Build
pnpm turbo build                          # Build all packages
pnpm turbo build --filter=@kharcha/shared # Build shared only

# Test
pnpm turbo test                           # Run all tests
pnpm --filter @kharcha/shared test        # Test shared only
pnpm --filter @kharcha/server test        # Test server only
pnpm --filter @kharcha/server test:e2e    # Integration tests

# Lint & Format
pnpm turbo lint                           # Lint all
pnpm format                               # Prettier format all

# Database
pnpm --filter @kharcha/server exec prisma studio      # Visual DB browser
pnpm --filter @kharcha/server exec prisma migrate dev  # Apply migrations
pnpm --filter @kharcha/server exec prisma db seed      # Reset + seed data
pnpm --filter @kharcha/server exec prisma generate     # Regenerate client

# Docker
docker ps                                              # Check running containers
docker stop kharcha-postgres kharcha-redis             # Stop infra
docker start kharcha-postgres kharcha-redis            # Start infra
docker rm -f kharcha-postgres kharcha-redis            # Remove containers entirely
```

### Environment Variables (`.env`)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production-min-32-chars-long
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
API_PORT=3001
API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| Next.js (client) | 3000 | http://localhost:3000 |
| NestJS (server) | 3001 | http://localhost:3001 |
| Swagger docs | 3001 | http://localhost:3001/api/docs |
| PostgreSQL | 54322 | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Redis | 6379 | `redis://localhost:6379` |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## 1. Architecture Summary

Kharcha is a modular monolith expense splitting platform. The **Next.js 14+ App Router** (`apps/client`) serves as both frontend and BFF — it handles session management via NextAuth v5, renders React Server Components, and proxies authenticated requests to the **NestJS API** (`apps/server`) using JWT Bearer tokens. The NestJS server is organized into domain modules (Auth, User, Group, Expense, Balance, Settlement, Export, Notification) with shared guards, interceptors, and pipes. **PostgreSQL** (Docker, `postgres:17-alpine`) stores all persistent data through **Prisma ORM** with integer-based money storage (paise/cents). **Redis** (Docker, `redis:7-alpine`) caches computed balances and handles rate-limiting state. A `packages/shared` package provides types, constants, and pure utility functions (money math, split calculations) consumed by both apps.

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       BROWSER                                │
│  Next.js App Router (RSC + Client Components)                │
│  Tailwind CSS + shadcn/ui + TanStack Query                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS (Session Cookie)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS BFF LAYER (apps/client)             │
│  /app/api/* Route Handlers                                   │
│  NextAuth v5 (Credentials + Google OAuth)                    │
│  Session validation → JWT issuance → Request forwarding       │
└───────────────────────┬─────────────────────────────────────┘
                        │ Internal HTTP (JWT Bearer)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  NESTJS API SERVER (apps/server)              │
│  ┌────────┐ ┌───────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │  Auth  │ │ User  │ │ Group  │ │Expense │ │ Balance  │  │
│  │ Module │ │Module │ │ Module │ │ Module │ │  Module  │  │
│  └────────┘ └───────┘ └────────┘ └────────┘ └──────────┘  │
│  ┌──────────┐ ┌────────┐ ┌──────────────┐                  │
│  │Settlement│ │ Export │ │ Notification │                  │
│  │  Module  │ │ Module │ │    Module    │                  │
│  └──────────┘ └────────┘ └──────────────┘                  │
│  Shared: Guards, Interceptors, Pipes, Filters, EventEmitter │
└──────┬──────────────────┬──────────────────┬────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌────────────┐    ┌────────────┐    ┌────────────────┐
│ PostgreSQL │    │   Redis    │    │  Local FS /    │
│  (Docker)  │    │  (Docker)  │    │  GCS (future)  │
│ Port 54322 │    │ Port 6379  │    │  for receipts  │
└────────────┘    └────────────┘    └────────────────┘
```

### Tech Stack Table

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 14.2+ |
| UI Framework | Tailwind CSS + shadcn/ui | 3.4+ / latest |
| Client State | TanStack React Query | 5.x |
| BFF Auth | NextAuth v5 | 5.x |
| Backend | NestJS (modular monolith) | 10.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL (Docker) | 17 |
| Cache | Redis (Docker) | 7.x |
| Validation (server) | class-validator + class-transformer | 0.14 / 0.5 |
| Validation (client) | Zod | 3.23 |
| PDF Generation | @react-pdf/renderer | 3.x |
| CSV Generation | papaparse | 5.x |
| Icons | lucide-react | 0.400+ |
| Monorepo | Turborepo + pnpm workspaces | 2.x |
| Testing (server) | Jest + Supertest | 29.x / 7.x |
| Testing (client) | Vitest + Testing Library | 2.x / 16.x |
| E2E Testing | Playwright | 1.45+ |
| Real-time | SSE (Server-Sent Events) | native |
| Package Manager | pnpm | 9.x |
| Node.js | Node.js | 20.x LTS |

---

## 2. Monorepo Skeleton

### Full Folder Tree (Initial Scaffolding)

```
kharcha/
├── apps/
│   ├── client/                          # Next.js 14+ App Router (@kharcha/client)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── groups/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [groupId]/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── balances/page.tsx
│   │   │   │   │   │   ├── settle/page.tsx
│   │   │   │   │   │   └── export/page.tsx
│   │   │   │   │   └── new/page.tsx
│   │   │   │   ├── activity/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── api/
│   │   │   │   └── auth/[...nextauth]/route.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   └── ui/                      # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── server/                          # NestJS API (@kharcha/server)
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── filters/
│       │   │   ├── pipes/
│       │   │   ├── decorators/
│       │   │   └── dto/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── user/
│       │   │   ├── group/
│       │   │   ├── expense/
│       │   │   ├── balance/
│       │   │   ├── settlement/
│       │   │   ├── export/
│       │   │   └── notification/
│       │   ├── prisma/
│       │   │   ├── prisma.module.ts
│       │   │   └── prisma.service.ts
│       │   └── redis/
│       │       ├── redis.module.ts
│       │       └── redis.service.ts
│       ├── test/
│       │   └── fixtures/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── Dockerfile
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       └── package.json
│
├── packages/
│   └── shared/                          # @kharcha/shared
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.ts
│       │   │   ├── group.ts
│       │   │   ├── expense.ts
│       │   │   ├── balance.ts
│       │   │   ├── settlement.ts
│       │   │   └── api-response.ts
│       │   ├── constants/
│       │   │   ├── currencies.ts
│       │   │   ├── categories.ts
│       │   │   └── split-types.ts
│       │   ├── utils/
│       │   │   ├── money.ts
│       │   │   ├── split.ts
│       │   │   └── validation.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── PRD.md
│   └── TECH_SPEC.md
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                         # Root workspace package.json
├── tsconfig.base.json                   # Base TS config extended by all packages
├── .eslintrc.js                         # Root ESLint config
├── .prettierrc                          # Prettier config
├── .gitignore
├── .env.example
└── .npmrc
```

### Root Config Files

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo pipeline config (build, lint, test, dev tasks) |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` as workspace members |
| `package.json` | Root scripts, devDeps (turbo, prettier, eslint, husky, lint-staged, commitlint) |
| `tsconfig.base.json` | Shared TS compiler options (strict, ESNext, path aliases) |
| `.eslintrc.js` | Shared ESLint rules extended by each app/package |
| `.prettierrc` | Consistent formatting (singleQuote, trailingComma, etc.) |
| `.env.example` | Template for all required environment variables |
| `.npmrc` | `shamefully-hoist=true` or strict pnpm settings |
| `.gitignore` | node_modules, dist, .next, .env, .turbo |

---

## 3. Phased Execution Plan

### Phase 0: Monorepo Scaffolding + Docker Infra + Shared Foundation (COMPLETE)

**Goal:** Establish the Turborepo monorepo structure, Docker containers for Postgres and Redis, and the `packages/shared` foundation with types, constants, and utility functions.

**Deliverables:**
- Working Turborepo monorepo with `apps/client`, `apps/server`, `packages/shared`
- Docker: `kharcha-postgres` (port 54322) + `kharcha-redis` (port 6379)
- `packages/shared` with money utils, split calculator, types, and constants — all compiling and passing tests
- Root configs: turbo.json, pnpm-workspace.yaml, tsconfig.base.json, ESLint, Prettier, .env.example

**Dependencies:** None

**Key files created:**
- `turbo.json`, `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`
- `.eslintrc.js`, `.prettierrc`, `.gitignore`, `.env.example`, `.npmrc`
- `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- `packages/shared/src/types/*.ts` (user, group, expense, balance, settlement, api-response)
- `packages/shared/src/constants/*.ts` (currencies, categories, split-types)
- `packages/shared/src/utils/money.ts`, `packages/shared/src/utils/split.ts`, `packages/shared/src/utils/validation.ts`
- `apps/client/package.json`, `apps/client/tsconfig.json` (minimal Next.js stub)
- `apps/server/package.json`, `apps/server/tsconfig.json` (minimal NestJS stub)

**Definition of Done:**
- [x] `pnpm install` completes without errors at monorepo root
- [x] `pnpm turbo build --filter=@kharcha/shared` succeeds
- [x] `docker exec kharcha-postgres pg_isready -U postgres` → "accepting connections"
- [x] `docker exec kharcha-redis redis-cli ping` → "PONG"
- [x] 41 unit tests pass (`pnpm --filter @kharcha/shared test`)

---

### Phase 1: Prisma Schema + Migrations + Seed Data

**Goal:** Define the complete Prisma schema matching the tech spec, run the initial migration against Postgres, and create seed data for development.

**Deliverables:**
- `prisma/schema.prisma` with all models (User, Account, Group, GroupMember, Participant, Expense, ExpenseSplit, Settlement, Notification)
- Initial migration applied to Postgres
- Seed script creating demo users, a demo group, sample expenses, and settlements
- Generated Prisma Client

**Dependencies:** Phase 0

**Key files created/modified:**
- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/` (auto-generated)
- `apps/server/prisma/seed.ts`
- `apps/server/package.json` (add prisma scripts)

**Definition of Done:**
- [ ] `pnpm --filter @kharcha/server exec prisma migrate dev` runs clean
- [ ] `pnpm --filter @kharcha/server exec prisma db seed` populates demo data
- [ ] `pnpm --filter @kharcha/server exec prisma studio` shows all tables with data
- [ ] All integer amount fields use `Int` type (not Decimal/Float)

---

### Phase 2: NestJS Bootstrap

**Goal:** Bootstrap the NestJS application with core infrastructure modules (Prisma, Redis, health check), shared guards/interceptors/filters/pipes, and API response envelope.

**Deliverables:**
- NestJS app running on port 3001 with `GET /health` endpoint
- PrismaModule (global) + PrismaService with connection lifecycle
- RedisModule (global) + RedisService wrapping ioredis
- Global validation pipe, HTTP exception filter, transform interceptor, logging interceptor
- Response envelope pattern (`{ success, data, meta }` / `{ success, error }`)
- Swagger/OpenAPI setup at `/api/docs`

**Dependencies:** Phase 0, Phase 1

**Key files created/modified:**
- `apps/server/src/main.ts`
- `apps/server/src/app.module.ts`
- `apps/server/src/prisma/prisma.module.ts`, `prisma.service.ts`
- `apps/server/src/redis/redis.module.ts`, `redis.service.ts`
- `apps/server/src/common/pipes/validation.pipe.ts`
- `apps/server/src/common/filters/http-exception.filter.ts`
- `apps/server/src/common/interceptors/transform.interceptor.ts`
- `apps/server/src/common/interceptors/logging.interceptor.ts`
- `apps/server/src/common/dto/pagination.dto.ts`

**Definition of Done:**
- [ ] `pnpm --filter @kharcha/server start:dev` starts server on port 3001
- [ ] `curl http://localhost:3001/health` returns `{ "success": true, "data": { "status": "ok" } }`
- [ ] Swagger UI accessible at `http://localhost:3001/api/docs`
- [ ] PrismaService connects to Postgres (port 54322)
- [ ] RedisService connects to Redis (port 6379)

---

### Phase 3: Auth Module

**Goal:** Implement user registration and login on the NestJS server (credential-based with bcrypt + JWT), JWT strategy and guards, and set up NextAuth v5 on the client with Credentials + Google OAuth providers.

**Deliverables:**
- `POST /auth/register` — creates user, returns JWT
- `POST /auth/login` — validates credentials, returns JWT
- `GET /auth/me` — returns current user (JWT-protected)
- JwtAuthGuard for protecting endpoints
- NextAuth v5 configured in `apps/client` with Credentials provider (delegates to NestJS) and Google OAuth
- BFF route handler at `/api/auth/[...nextauth]`

**Dependencies:** Phase 2

**Key files created/modified:**
- `apps/server/src/modules/auth/auth.module.ts`
- `apps/server/src/modules/auth/auth.controller.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/server/src/modules/auth/dto/register.dto.ts`
- `apps/server/src/modules/auth/dto/login.dto.ts`
- `apps/server/src/common/guards/jwt-auth.guard.ts`
- `apps/server/src/common/decorators/current-user.decorator.ts`
- `apps/client/lib/auth.ts`
- `apps/client/app/api/auth/[...nextauth]/route.ts`
- `packages/shared/src/types/user.ts` (LoginRequest, RegisterRequest, AuthResponse)

**Definition of Done:**
- [ ] `POST /auth/register` with `{ email, password, name }` returns 201 with JWT
- [ ] `POST /auth/login` returns 200 with JWT for valid credentials, 401 for invalid
- [ ] `GET /auth/me` with Bearer token returns user profile
- [ ] NextAuth sign-in page renders at `http://localhost:3000/login`

---

### Phase 4: User Module

**Goal:** Implement user profile CRUD and cross-group balance summary on the server, and profile settings UI on the client.

**Deliverables:**
- `PATCH /users/me` — update name, avatar, default currency
- `GET /users/me/summary` — aggregate balance across all groups
- Client settings page with profile edit form

**Dependencies:** Phase 3

**Key files created/modified:**
- `apps/server/src/modules/user/user.module.ts`
- `apps/server/src/modules/user/user.controller.ts`
- `apps/server/src/modules/user/user.service.ts`
- `apps/server/src/modules/user/dto/update-user.dto.ts`
- `apps/client/app/(dashboard)/settings/page.tsx`
- `apps/client/components/settings/profile-form.tsx`
- `packages/shared/src/types/user.ts` (UpdateUserDto, UserSummary)

**Definition of Done:**
- [ ] `PATCH /users/me` updates profile and returns updated user
- [ ] `GET /users/me/summary` returns `{ totalOwed, totalOwing, groups: [...] }`
- [ ] Settings page allows editing name and default currency
- [ ] All endpoints require JWT auth

---

### Phase 5: Group Module

**Goal:** Implement group CRUD, invite link generation/regeneration, and join-via-invite on both server and client. Include the GroupMemberGuard for authorization.

**Deliverables:**
- `POST /groups` — create group (creator becomes ADMIN)
- `GET /groups` — list user's groups
- `GET /groups/:groupId` — group detail with member list
- `PATCH /groups/:groupId` — update (admin only)
- `POST /groups/:groupId/archive` — soft-archive (admin only)
- `GET /groups/:groupId/invite` — get invite link
- `POST /groups/join/:inviteCode` — join group
- GroupMemberGuard + GroupRole decorator
- Client: group list page, create group form, group detail page, invite dialog, member list

**Dependencies:** Phase 3, Phase 4

**Key files created/modified:**
- `apps/server/src/modules/group/group.module.ts`
- `apps/server/src/modules/group/group.controller.ts`
- `apps/server/src/modules/group/group.service.ts`
- `apps/server/src/modules/group/dto/create-group.dto.ts`
- `apps/server/src/modules/group/dto/update-group.dto.ts`
- `apps/server/src/common/guards/group-member.guard.ts`
- `apps/server/src/common/decorators/group-role.decorator.ts`
- `apps/client/app/(dashboard)/groups/page.tsx`
- `apps/client/app/(dashboard)/groups/new/page.tsx`
- `apps/client/app/(dashboard)/groups/[groupId]/page.tsx`
- `apps/client/components/groups/group-card.tsx`
- `apps/client/components/groups/group-form.tsx`
- `apps/client/components/groups/invite-dialog.tsx`
- `apps/client/components/groups/member-list.tsx`
- `apps/client/hooks/use-groups.ts`
- `apps/client/lib/api-client.ts`
- `packages/shared/src/types/group.ts` (CreateGroupDto, GroupResponse, etc.)

**Definition of Done:**
- [ ] Full group lifecycle works: create → invite → join → list members → archive
- [ ] Non-members receive 403 on group-scoped endpoints
- [ ] Client shows group list, group detail with members, and working invite flow
- [ ] Invite codes are short (nanoid) and unique

---

### Phase 6: Expense Module

**Goal:** Implement expense creation with all 4 split types (equal, exact, percentage, shares), expense listing with filters, update, and delete. Build client forms with the split selector UI.

**Deliverables:**
- `POST /groups/:groupId/expenses` — create expense with splits (uses `calculateSplit` from shared)
- `GET /groups/:groupId/expenses` — list with filters (category, date range, paidBy, search, cursor pagination)
- `GET /groups/:groupId/expenses/:expenseId` — expense detail with splits
- `PATCH /groups/:groupId/expenses/:expenseId` — update (creator or admin)
- `DELETE /groups/:groupId/expenses/:expenseId` — soft-delete
- Idempotency key support on creation
- Client: expense creation form with split type selector, expense list, expense card

**Dependencies:** Phase 5

**Key files created/modified:**
- `apps/server/src/modules/expense/expense.module.ts`
- `apps/server/src/modules/expense/expense.controller.ts`
- `apps/server/src/modules/expense/expense.service.ts`
- `apps/server/src/modules/expense/split-calculator.service.ts`
- `apps/server/src/modules/expense/dto/create-expense.dto.ts`
- `apps/server/src/modules/expense/dto/expense-filter.dto.ts`
- `apps/client/app/(dashboard)/groups/[groupId]/page.tsx` (expense list added)
- `apps/client/components/expenses/expense-form.tsx`
- `apps/client/components/expenses/expense-list.tsx`
- `apps/client/components/expenses/expense-card.tsx`
- `apps/client/components/expenses/split-selector.tsx`
- `apps/client/hooks/use-expenses.ts`
- `packages/shared/src/types/expense.ts` (CreateExpenseDto, ExpenseResponse, etc.)

**Definition of Done:**
- [ ] Creating an expense with each split type (EQUAL, EXACT, PERCENTAGE, SHARES) produces correct splits
- [ ] Splits sum exactly equals total amount (zero-sum verified via test)
- [ ] Duplicate idempotency key returns existing expense (not a new one)
- [ ] Cursor-based pagination works for expense listing
- [ ] Client form allows selecting split type and entering split values

---

### Phase 7: Balance Module

**Goal:** Implement balance computation from expenses and settlements, Redis caching with invalidation, and the debt simplification algorithm.

**Deliverables:**
- `GET /groups/:groupId/balances` — raw pairwise balances
- `GET /groups/:groupId/balances/simplified` — minimum cash flow settlement plan
- Balance computation from DB (total paid - total owed + settlements)
- Redis cache with 5-minute TTL (invalidated on expense/settlement writes via EventEmitter)
- `simplifyDebts()` algorithm matching tech spec

**Dependencies:** Phase 6

**Key files created/modified:**
- `apps/server/src/modules/balance/balance.module.ts`
- `apps/server/src/modules/balance/balance.controller.ts`
- `apps/server/src/modules/balance/balance.service.ts`
- `apps/server/src/modules/balance/simplify.service.ts`
- `packages/shared/src/types/balance.ts` (BalanceResponse, SimplifiedBalanceResponse)

**Definition of Done:**
- [ ] Balance computation returns correct net amounts for a group with 3+ expenses
- [ ] Simplified balances produce fewer transactions than raw pairwise
- [ ] Balance cache is populated on first read and invalidated on expense creation
- [ ] Zero-sum invariant holds: sum of all net balances = 0

---

### Phase 8: Settlement Module

**Goal:** Implement settlement recording and listing, with automatic balance cache invalidation when a settlement is created.

**Deliverables:**
- `POST /groups/:groupId/settlements` — record a settlement payment
- `GET /groups/:groupId/settlements` — settlement history
- Event emission on settlement creation (triggers balance cache invalidation + notifications)

**Dependencies:** Phase 7

**Key files created/modified:**
- `apps/server/src/modules/settlement/settlement.module.ts`
- `apps/server/src/modules/settlement/settlement.controller.ts`
- `apps/server/src/modules/settlement/settlement.service.ts`
- `apps/server/src/modules/settlement/dto/create-settlement.dto.ts`
- `packages/shared/src/types/settlement.ts` (CreateSettlementDto, SettlementResponse)

**Definition of Done:**
- [ ] Creating a settlement updates balances correctly (verified via GET /balances)
- [ ] Settlement creation invalidates Redis balance cache
- [ ] Settlement history lists all settlements for a group
- [ ] Both paidBy and paidTo must be group members (validated)

---

### Phase 9: Dashboard UI

**Goal:** Build the main dashboard showing balance summary, group overview, and recent activity. This is the primary landing page after login.

**Deliverables:**
- Dashboard page with: "You owe" / "You are owed" summary cards
- Group cards with per-group balance preview
- Recent activity feed (latest expenses across all groups)
- App shell layout (sidebar, header, mobile nav)

**Dependencies:** Phase 7, Phase 8

**Key files created/modified:**
- `apps/client/app/(dashboard)/page.tsx`
- `apps/client/app/(dashboard)/layout.tsx`
- `apps/client/components/layout/sidebar.tsx`
- `apps/client/components/layout/header.tsx`
- `apps/client/components/layout/mobile-nav.tsx`
- `apps/client/components/balances/balance-summary.tsx`
- `apps/client/components/balances/balance-pair.tsx`
- `apps/client/components/groups/group-card.tsx` (enhanced with balance)
- `apps/client/hooks/use-balances.ts`

**Definition of Done:**
- [ ] Dashboard loads and shows correct aggregate balances from `/users/me/summary`
- [ ] Group cards show per-group net balance (green = owed to you, red = you owe)
- [ ] Layout has working sidebar navigation and responsive mobile nav
- [ ] Page renders correctly with zero groups (empty state)

---

### Phase 10: Expense History UI

**Goal:** Build the expense history view with filtering, search, and cursor-based pagination within a group.

**Deliverables:**
- Expense history page within group detail
- Filter controls: date range, category, paid by, search text
- Cursor-based infinite scroll or "load more" pagination
- Expense detail modal/drawer

**Dependencies:** Phase 6, Phase 9

**Key files created/modified:**
- `apps/client/app/(dashboard)/groups/[groupId]/page.tsx` (enhanced)
- `apps/client/components/expenses/expense-filters.tsx`
- `apps/client/components/expenses/expense-list.tsx` (enhanced with pagination)
- `apps/client/components/expenses/expense-detail.tsx`
- `apps/client/hooks/use-expenses.ts` (enhanced with infinite query)

**Definition of Done:**
- [ ] Expense list loads with cursor-based pagination (TanStack Query infinite query)
- [ ] Filtering by category, date range, and search text works
- [ ] Clicking an expense shows full detail with split breakdown
- [ ] Empty state shown when no expenses match filters

---

### Phase 11: Settlement UI

**Goal:** Build the settlement flow UI — view suggested settlements, record a payment, and browse settlement history.

**Deliverables:**
- Balances page showing pairwise balances and simplified settlement suggestions
- Settle form (select who you're paying, amount pre-filled from suggestion)
- Settlement history list within group

**Dependencies:** Phase 8, Phase 9

**Key files created/modified:**
- `apps/client/app/(dashboard)/groups/[groupId]/balances/page.tsx`
- `apps/client/app/(dashboard)/groups/[groupId]/settle/page.tsx`
- `apps/client/components/balances/simplify-view.tsx`
- `apps/client/components/settlements/settle-form.tsx`
- `apps/client/components/settlements/settlement-list.tsx`
- `apps/client/hooks/use-settlements.ts`

**Definition of Done:**
- [ ] Balances page shows both raw pairwise and simplified views
- [ ] Settle form pre-fills amount from suggested settlement
- [ ] After recording settlement, balances update immediately (cache invalidated)
- [ ] Settlement history displays with date, from, to, amount

---

### Phase 12: Export Module

**Goal:** Implement PDF and CSV export generation on the server, and the export UI on the client.

**Deliverables:**
- `GET /groups/:groupId/export?format=pdf|csv&from=&to=` — generates and streams file
- PDF template with: group info, per-person breakdown, simplified settlements, itemized expenses
- CSV with machine-readable expense rows
- Rate-limited (10 exports/minute)
- Client export page with format selector and date range picker

**Dependencies:** Phase 7 (needs balance computation), Phase 6 (needs expense data)

**Key files created/modified:**
- `apps/server/src/modules/export/export.module.ts`
- `apps/server/src/modules/export/export.controller.ts`
- `apps/server/src/modules/export/export.service.ts`
- `apps/server/src/modules/export/pdf.renderer.ts`
- `apps/server/src/modules/export/csv.renderer.ts`
- `apps/client/app/(dashboard)/groups/[groupId]/export/page.tsx`
- `apps/client/components/export/export-form.tsx`

**Definition of Done:**
- [ ] PDF export downloads with correct group data, member breakdown, and itemized expenses
- [ ] CSV export is parseable by spreadsheet software
- [ ] Export endpoint is rate-limited (returns 429 after 10 requests/minute)
- [ ] Date range filtering works for both formats

---

### Phase 13: Notification Module

**Goal:** Implement the internal event system, SSE endpoint for real-time push, and in-app notification feed.

**Deliverables:**
- NestJS EventEmitter for `expense.created`, `expense.updated`, `settlement.created`, `group.member.joined`
- Notification model writes to DB on each event
- SSE endpoint at `GET /events/stream` for real-time push
- Client notification feed (bell icon with unread count, dropdown with notification list)
- Client SSE hook for live updates

**Dependencies:** Phase 6, Phase 8

**Key files created/modified:**
- `apps/server/src/modules/notification/notification.module.ts`
- `apps/server/src/modules/notification/notification.service.ts`
- `apps/server/src/modules/notification/notification.gateway.ts`
- `apps/server/src/modules/notification/events.enum.ts`
- `apps/client/hooks/use-sse.ts`
- `apps/client/components/layout/notification-bell.tsx`
- `apps/client/components/layout/notification-feed.tsx`

**Definition of Done:**
- [ ] Creating an expense generates notifications for all affected users (except payer)
- [ ] SSE connection receives live events when another user adds an expense
- [ ] Notification bell shows unread count
- [ ] Marking notifications as read updates the count

---

### Phase 14: Categories, Tags, Recurring Expenses

**Goal:** Add expense categories (pre-defined + custom tags), category-based spending breakdown, and recurring expense scheduling.

**Deliverables:**
- Pre-defined categories from `packages/shared/src/constants/categories.ts`
- Custom tags on expenses (already in schema as `String[]`)
- Category breakdown API: `GET /groups/:groupId/expenses/breakdown?by=category`
- Recurring expense setup: `isRecurring` + `recurrenceRule` (RRULE format)
- NestJS cron job that auto-creates expenses from recurring rules
- Client: category selector in expense form, category breakdown chart, recurring expense toggle

**Dependencies:** Phase 6

**Key files created/modified:**
- `apps/server/src/modules/expense/expense.service.ts` (enhanced with recurring logic)
- `apps/server/src/modules/expense/recurring.service.ts`
- `apps/client/components/expenses/expense-form.tsx` (enhanced with category/tags/recurring)
- `apps/client/components/expenses/category-breakdown.tsx`
- `packages/shared/src/constants/categories.ts` (finalized list)

**Definition of Done:**
- [ ] Expenses can be created with category and tags
- [ ] Category breakdown API returns correct per-category totals
- [ ] Recurring expense auto-creates on schedule (test with short interval)
- [ ] Client form supports category selection and recurring toggle

---

### Phase 15: Testing Suite

**Goal:** Build comprehensive test coverage: unit tests for split engine and simplification algorithm, integration tests for all API endpoints, and E2E tests for critical user flows.

**Deliverables:**
- Unit tests in `packages/shared` (split.test.ts, money.test.ts)
- Unit tests in `apps/server` (simplify.service.spec.ts, split-calculator.service.spec.ts)
- Integration tests (supertest) for all API modules
- E2E tests (Playwright) for: sign up → create group → add expense → view balance → settle

**Dependencies:** All prior phases

**Key files created/modified:**
- `packages/shared/src/utils/split.test.ts`
- `packages/shared/src/utils/money.test.ts`
- `apps/server/src/modules/balance/simplify.service.spec.ts`
- `apps/server/src/modules/expense/split-calculator.service.spec.ts`
- `apps/server/test/auth.e2e-spec.ts`
- `apps/server/test/groups.e2e-spec.ts`
- `apps/server/test/expenses.e2e-spec.ts`
- `apps/server/test/balances.e2e-spec.ts`
- `apps/server/test/settlements.e2e-spec.ts`
- `apps/server/test/export.e2e-spec.ts`
- `apps/client/e2e/auth.spec.ts`
- `apps/client/e2e/expense-flow.spec.ts`
- `apps/client/e2e/settlement-flow.spec.ts`

**Definition of Done:**
- [ ] All unit tests pass: `pnpm turbo test`
- [ ] Integration tests pass against test DB: `pnpm --filter @kharcha/server test:e2e`
- [ ] Playwright E2E tests pass: `pnpm --filter @kharcha/client test:e2e`
- [ ] Split engine tests cover: equal remainder, percentage rounding, shares rounding, exact mismatch error
- [ ] Simplify algorithm tests cover: 2-person, 3-person circular, 10-person random, empty group

---

## 4. Claude Code Prompts

---

### Phase 0: Monorepo Scaffolding + Docker Infra + Shared Foundation (COMPLETE)
**Goal:** Establish the full monorepo structure, local dev infrastructure, and shared package with types/utils.
**Depends on:** Nothing

#### Prompt:

<prompt>
# CONTEXT
You are initializing a Turborepo monorepo from scratch for the Kharcha (खर्चा) expense splitting app.
- `apps/client` — Next.js 14+ App Router (frontend + BFF) — package name: `@kharcha/client`
- `apps/server` — NestJS modular monolith (backend API) — package name: `@kharcha/server`
- `packages/shared` — Shared types, constants, utility functions — package name: `@kharcha/shared`

# EXPLORATION (do this FIRST, before writing any code)
1. Run `ls` to see the current state of the project root
2. Check if `node` and `pnpm` are installed: `node -v && pnpm -v`
3. Check if Docker is running: `docker info`
4. Check if Redis is available: `redis-server --version` or `redis-cli ping` (if not, note it for manual install)

# TASK
Build the complete monorepo skeleton and local dev infrastructure.

## Step 1: Root Monorepo Setup

Create the root `package.json`:
```json
{
  "name": "kharcha",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.3",
    "prettier": "^3.4",
    "eslint": "^9.15",
    "husky": "^9.1",
    "lint-staged": "^15.2",
    "@commitlint/cli": "^19.6",
    "@commitlint/config-conventional": "^19.6",
    "typescript": "^5.7"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml}": ["prettier --write"]
  }
}
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Create `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

Create `.eslintrc.js` (flat config or legacy — use legacy for broadest NestJS compatibility):
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist', '.next', 'node_modules', '.turbo'],
};
```

Create `.npmrc`:
```
auto-install-peers=true
```

Create `.gitignore`:
```
node_modules/
dist/
.next/
.turbo/
.env
.env.local
*.log
.DS_Store
```

Create `.env.example`:
```bash
# ─── Database (Docker Postgres) ───
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# ─── Redis ───
REDIS_URL=redis://localhost:6379

# ─── Auth ───
JWT_SECRET=dev-jwt-secret-change-in-production
NEXTAUTH_SECRET=dev-nextauth-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── API ───
API_PORT=3001
API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000

# ─── Storage (future) ───
# GCS_BUCKET_RECEIPTS=
# GCS_BUCKET_EXPORTS=
```

## Step 2: Start Docker Infrastructure

Start Postgres and Redis as lightweight Docker containers:

```bash
# Postgres 17 on port 54322
docker run -d --name kharcha-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 54322:5432 \
  postgres:17-alpine

# Redis 7 on port 6379
docker run -d --name kharcha-redis \
  -p 6379:6379 \
  redis:7-alpine
```

Verify:
```bash
docker exec kharcha-postgres pg_isready -U postgres   # → "accepting connections"
docker exec kharcha-redis redis-cli ping               # → "PONG"
```

After a reboot, restart with: `docker start kharcha-postgres kharcha-redis`

**Why plain Docker instead of Supabase local?** Supabase local starts 12+ containers (Auth, Storage, Realtime, Edge Functions, Studio, API gateway, analytics, etc.) — we only need Postgres. Plain Docker = 2 containers, ~50MB RAM instead of ~1.5GB.

## Step 4: `packages/shared` Package

Create `packages/shared/package.json`:
```json
{
  "name": "@kharcha/shared",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^2.1",
    "@typescript-eslint/parser": "^8.0",
    "@typescript-eslint/eslint-plugin": "^8.0",
    "eslint-config-prettier": "^9.1"
  }
}
```

Create `packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

### Types — Create these files:

**`packages/shared/src/types/user.ts`:**
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  avatarUrl?: string;
  defaultCurrency?: string;
}

export interface UserSummary {
  totalOwedInPaise: number;
  totalOwingInPaise: number;
  groups: {
    groupId: string;
    groupName: string;
    netBalanceInPaise: number;
  }[];
}
```

**`packages/shared/src/types/group.ts`:**
```typescript
export type GroupRole = 'ADMIN' | 'MEMBER';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  inviteCode: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}
```

**`packages/shared/src/types/expense.ts`:**
```typescript
export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export interface SplitEntry {
  userId: string;
  value?: number; // exact amount in paise (EXACT), percentage (PERCENTAGE), share ratio (SHARES). Omit for EQUAL.
}

export interface CreateExpenseRequest {
  amountInPaise: number;
  currency?: string;
  description: string;
  category?: string;
  tags?: string[];
  splitType: SplitType;
  date: string; // ISO date string YYYY-MM-DD
  paidById: string;
  splits: SplitEntry[];
  idempotencyKey?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

export interface ExpenseSplitResponse {
  id: string;
  userId: string;
  userName?: string;
  owedAmountInPaise: number;
  shareValue: number | null;
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  paidByName?: string;
  amountInPaise: number;
  currency: string;
  description: string;
  category: string | null;
  tags: string[];
  splitType: SplitType;
  date: string;
  receiptUrl: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdAt: string;
  splits?: ExpenseSplitResponse[];
}

export interface ExpenseFilterParams {
  category?: string;
  from?: string;
  to?: string;
  paidBy?: string;
  splitWith?: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
  sort?: string;
}
```

**`packages/shared/src/types/balance.ts`:**
```typescript
export interface PairwiseBalance {
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  amountInPaise: number;
}

export interface BalanceResponse {
  groupId: string;
  balances: PairwiseBalance[];
  updatedAt: string;
}

export interface SimplifiedSettlement {
  from: { id: string; name: string };
  to: { id: string; name: string };
  amountInPaise: number;
}

export interface SimplifiedBalanceResponse {
  groupId: string;
  settlements: SimplifiedSettlement[];
  originalTransactionCount: number;
  simplifiedTransactionCount: number;
}

export interface NetBalance {
  userId: string;
  netInPaise: number; // positive = owed money, negative = owes money
}
```

**`packages/shared/src/types/settlement.ts`:**
```typescript
export interface CreateSettlementRequest {
  paidById: string;
  paidToId: string;
  amountInPaise: number;
  note?: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  paidById: string;
  paidByName?: string;
  paidToId: string;
  paidToName?: string;
  amountInPaise: number;
  note: string | null;
  createdAt: string;
}
```

**`packages/shared/src/types/api-response.ts`:**
```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page?: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  cursor?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

### Constants — Create these files:

**`packages/shared/src/constants/currencies.ts`:**
```typescript
export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', subunit: 'paise', factor: 100 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', subunit: 'cents', factor: 100 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', subunit: 'cents', factor: 100 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', subunit: 'pence', factor: 100 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const DEFAULT_CURRENCY: CurrencyCode = 'INR';
```

**`packages/shared/src/constants/categories.ts`:**
```typescript
export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'accommodation',
  'entertainment',
  'shopping',
  'utilities',
  'rent',
  'groceries',
  'health',
  'education',
  'subscriptions',
  'travel',
  'gifts',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
```

**`packages/shared/src/constants/split-types.ts`:**
```typescript
export const SPLIT_TYPES = {
  EQUAL: { value: 'EQUAL', label: 'Split equally', description: 'Everyone pays the same amount' },
  EXACT: { value: 'EXACT', label: 'Exact amounts', description: 'Specify exact amount for each person' },
  PERCENTAGE: { value: 'PERCENTAGE', label: 'By percentage', description: 'Specify percentage for each person' },
  SHARES: { value: 'SHARES', label: 'By shares', description: 'Specify share ratio (e.g., 2:1:1)' },
} as const;

export type SplitTypeKey = keyof typeof SPLIT_TYPES;
```

### Utility Functions:

**`packages/shared/src/utils/money.ts`:**
```typescript
/**
 * All monetary values are stored as integers in the smallest currency unit (paise for INR, cents for USD).
 * This eliminates floating-point precision issues in split calculations.
 */

export const toPaise = (amount: number): number => Math.round(amount * 100);

export const toDisplay = (paise: number): number => paise / 100;

export const formatINR = (paise: number): string => {
  const amount = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrency = (paise: number, currencyCode: string = 'INR'): string => {
  const amount = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
```

**`packages/shared/src/utils/split.ts`:**
```typescript
import type { SplitType } from '../types/expense';

export type SplitInput = {
  totalInPaise: number;
  splitType: SplitType;
  participants: { userId: string; value?: number }[];
};

export type SplitResult = {
  userId: string;
  owedInPaise: number;
}[];

export function calculateSplit(input: SplitInput): SplitResult {
  const { totalInPaise, splitType, participants } = input;

  if (participants.length === 0) {
    throw new Error('At least one participant is required');
  }
  if (totalInPaise <= 0) {
    throw new Error('Total amount must be positive');
  }

  switch (splitType) {
    case 'EQUAL':
      return splitEqual(totalInPaise, participants);
    case 'EXACT':
      return splitExact(totalInPaise, participants);
    case 'PERCENTAGE':
      return splitPercentage(totalInPaise, participants);
    case 'SHARES':
      return splitByShares(totalInPaise, participants);
  }
}

function splitEqual(
  totalInPaise: number,
  participants: { userId: string }[],
): SplitResult {
  const n = participants.length;
  const base = Math.floor(totalInPaise / n);
  const remainder = totalInPaise - base * n;

  return participants.map((p, i) => ({
    userId: p.userId,
    owedInPaise: base + (i < remainder ? 1 : 0),
  }));
}

function splitExact(
  totalInPaise: number,
  participants: { userId: string; value?: number }[],
): SplitResult {
  const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0);
  if (sum !== totalInPaise) {
    throw new Error(`Exact split sum (${sum}) does not equal total (${totalInPaise})`);
  }
  return participants.map((p) => ({
    userId: p.userId,
    owedInPaise: p.value!,
  }));
}

function splitPercentage(
  totalInPaise: number,
  participants: { userId: string; value?: number }[],
): SplitResult {
  const totalPercent = participants.reduce((s, p) => s + (p.value ?? 0), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${totalPercent}`);
  }

  let allocated = 0;
  const results = participants.map((p) => {
    const raw = Math.round((totalInPaise * (p.value ?? 0)) / 100);
    allocated += raw;
    return { userId: p.userId, owedInPaise: raw };
  });

  // Fix rounding: adjust last participant to maintain zero-sum
  const diff = totalInPaise - allocated;
  results[results.length - 1].owedInPaise += diff;

  return results;
}

function splitByShares(
  totalInPaise: number,
  participants: { userId: string; value?: number }[],
): SplitResult {
  const totalShares = participants.reduce((s, p) => s + (p.value ?? 1), 0);

  if (totalShares <= 0) {
    throw new Error('Total shares must be positive');
  }

  let allocated = 0;
  const results = participants.map((p) => {
    const raw = Math.round((totalInPaise * (p.value ?? 1)) / totalShares);
    allocated += raw;
    return { userId: p.userId, owedInPaise: raw };
  });

  // Fix rounding: adjust last participant to maintain zero-sum
  const diff = totalInPaise - allocated;
  results[results.length - 1].owedInPaise += diff;

  return results;
}
```

**`packages/shared/src/utils/validation.ts`:**
```typescript
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidCurrencyCode = (code: string): boolean =>
  /^[A-Z]{3}$/.test(code);

export const isPositiveInteger = (value: number): boolean =>
  Number.isInteger(value) && value > 0;
```

**`packages/shared/src/index.ts`:**
```typescript
// Types
export * from './types/user';
export * from './types/group';
export * from './types/expense';
export * from './types/balance';
export * from './types/settlement';
export * from './types/api-response';

// Constants
export * from './constants/currencies';
export * from './constants/categories';
export * from './constants/split-types';

// Utils
export * from './utils/money';
export * from './utils/split';
export * from './utils/validation';
```

### Tests for shared utils:

**`packages/shared/src/utils/money.test.ts`:**
```typescript
import { describe, it, expect } from 'vitest';
import { toPaise, toDisplay, formatINR } from './money';

describe('money utils', () => {
  it('converts rupees to paise', () => {
    expect(toPaise(100.10)).toBe(10010);
    expect(toPaise(0)).toBe(0);
    expect(toPaise(0.01)).toBe(1);
    expect(toPaise(999.99)).toBe(99999);
  });

  it('converts paise to display amount', () => {
    expect(toDisplay(10010)).toBe(100.10);
    expect(toDisplay(0)).toBe(0);
    expect(toDisplay(1)).toBe(0.01);
  });

  it('formats INR correctly', () => {
    expect(formatINR(150000)).toContain('1,500.00');
    expect(formatINR(100)).toContain('1.00');
  });
});
```

**`packages/shared/src/utils/split.test.ts`:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSplit } from './split';

describe('calculateSplit', () => {
  describe('EQUAL', () => {
    it('splits evenly among 3 people', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'EQUAL',
        participants: [
          { userId: 'a' },
          { userId: 'b' },
          { userId: 'c' },
        ],
      });
      expect(result).toEqual([
        { userId: 'a', owedInPaise: 3334 },
        { userId: 'b', owedInPaise: 3333 },
        { userId: 'c', owedInPaise: 3333 },
      ]);
      // Zero-sum check
      expect(result.reduce((s, r) => s + r.owedInPaise, 0)).toBe(10000);
    });

    it('handles remainder correctly with 7 people', () => {
      const result = calculateSplit({
        totalInPaise: 100,
        splitType: 'EQUAL',
        participants: Array.from({ length: 7 }, (_, i) => ({ userId: `u${i}` })),
      });
      expect(result.reduce((s, r) => s + r.owedInPaise, 0)).toBe(100);
    });
  });

  describe('EXACT', () => {
    it('accepts correct exact amounts', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'EXACT',
        participants: [
          { userId: 'a', value: 5000 },
          { userId: 'b', value: 3000 },
          { userId: 'c', value: 2000 },
        ],
      });
      expect(result.reduce((s, r) => s + r.owedInPaise, 0)).toBe(10000);
    });

    it('throws if exact amounts do not sum to total', () => {
      expect(() => calculateSplit({
        totalInPaise: 10000,
        splitType: 'EXACT',
        participants: [
          { userId: 'a', value: 5000 },
          { userId: 'b', value: 3000 },
        ],
      })).toThrow('does not equal total');
    });
  });

  describe('PERCENTAGE', () => {
    it('splits by percentage with rounding', () => {
      const result = calculateSplit({
        totalInPaise: 10001,
        splitType: 'PERCENTAGE',
        participants: [
          { userId: 'a', value: 33.33 },
          { userId: 'b', value: 33.33 },
          { userId: 'c', value: 33.34 },
        ],
      });
      expect(result.reduce((s, r) => s + r.owedInPaise, 0)).toBe(10001);
    });

    it('throws if percentages do not sum to 100', () => {
      expect(() => calculateSplit({
        totalInPaise: 10000,
        splitType: 'PERCENTAGE',
        participants: [
          { userId: 'a', value: 50 },
          { userId: 'b', value: 30 },
        ],
      })).toThrow('must sum to 100');
    });
  });

  describe('SHARES', () => {
    it('splits by shares 2:1:1', () => {
      const result = calculateSplit({
        totalInPaise: 10000,
        splitType: 'SHARES',
        participants: [
          { userId: 'a', value: 2 },
          { userId: 'b', value: 1 },
          { userId: 'c', value: 1 },
        ],
      });
      expect(result[0].owedInPaise).toBe(5000);
      expect(result[1].owedInPaise).toBe(2500);
      expect(result[2].owedInPaise).toBe(2500);
      expect(result.reduce((s, r) => s + r.owedInPaise, 0)).toBe(10000);
    });

    it('handles odd amounts with shares', () => {
      const result = calculateSplit({
        totalInPaise: 10001,
        splitType: 'SHARES',
        participants: [
          { userId: 'a', value: 2 },
          { userId: 'b', value: 1 },
          { userId: 'c', value: 1 },
        ],
      });
      expect(result.reduce((s, r) => s + r.owedInPaise, 0)).toBe(10001);
    });
  });

  it('throws for zero participants', () => {
    expect(() => calculateSplit({
      totalInPaise: 10000,
      splitType: 'EQUAL',
      participants: [],
    })).toThrow('At least one participant');
  });

  it('throws for negative total', () => {
    expect(() => calculateSplit({
      totalInPaise: -100,
      splitType: 'EQUAL',
      participants: [{ userId: 'a' }],
    })).toThrow('must be positive');
  });
});
```

## Step 5: Minimal App Stubs

**`apps/client/package.json`:**
```json
{
  "name": "@kharcha/client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@kharcha/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3"
  }
}
```

Create minimal `apps/client/tsconfig.json`, `apps/client/next.config.js`, and a placeholder `apps/client/app/page.tsx` that just renders "Kharcha — Coming Soon".

**`apps/server/package.json`:**
```json
{
  "name": "@kharcha/server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "start:dev": "nest start --watch",
    "lint": "eslint \"src/**/*.ts\"",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.config.ts"
  },
  "dependencies": {
    "@nestjs/core": "^10.4",
    "@nestjs/common": "^10.4",
    "@nestjs/platform-express": "^10.4",
    "@kharcha/shared": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4",
    "typescript": "^5.7",
    "@types/node": "^22"
  }
}
```

Create minimal `apps/server/tsconfig.json`, `apps/server/tsconfig.build.json`, `apps/server/nest-cli.json`, and a placeholder `apps/server/src/main.ts`.

## Step 6: Install and Verify

Run:
```bash
pnpm install
pnpm turbo build --filter=@kharcha/shared
pnpm --filter @kharcha/shared test
```

# CONVENTIONS
- Package names: `@kharcha/client`, `@kharcha/server`, `@kharcha/shared`
- All monetary values as integers (paise/cents) — see `packages/shared/src/utils/money.ts`
- Shared types in `packages/shared`, imported as `import { ... } from '@kharcha/shared'`
- Single quotes, trailing commas, 2-space indent, semicolons (Prettier config)
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, etc.)

# VALIDATION
When done, verify:
- [ ] `pnpm install` completes without errors
- [ ] `pnpm turbo build --filter=@kharcha/shared` produces `packages/shared/dist/` with .js and .d.ts files
- [ ] `pnpm --filter @kharcha/shared test` — all money and split tests pass
- [ ] `docker exec kharcha-postgres pg_isready -U postgres` → "accepting connections"
- [ ] `docker exec kharcha-redis redis-cli ping` → "PONG"
- [ ] `.env.example` exists with all documented env vars
- [ ] `pnpm turbo build` builds all three packages without errors (client/server may just be stubs)
</prompt>

---

### Phase 1: Prisma Schema + Migrations + Seed Data
**Goal:** Define the complete database schema in Prisma and seed it with demo data.
**Depends on:** Phase 0

#### Prompt:

<prompt>
# CONTEXT
You are working in a Turborepo monorepo for the Kharcha expense splitting app.
- `apps/client` — Next.js 14+ App Router (frontend + BFF)
- `apps/server` — NestJS modular monolith (backend API)
- `packages/shared` — Shared types, constants, utility functions
- Database: PostgreSQL via Docker (port 54322, user: postgres, password: postgres, db: postgres)

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/types/` to understand the type definitions already in place
2. Read `apps/server/package.json` to see current dependencies
3. Check if Prisma is already installed: `grep -r "prisma" apps/server/package.json`
4. Verify Postgres is running: `docker exec kharcha-postgres pg_isready -U postgres`

# TASK
Create the complete Prisma schema and seed data for the Kharcha database.

## Step 1: Install Prisma Dependencies

Add to `apps/server`:
```bash
pnpm --filter @kharcha/server add @prisma/client
pnpm --filter @kharcha/server add -D prisma
```

## Step 2: Initialize Prisma

```bash
cd apps/server
npx prisma init
```

## Step 3: Create the Schema

Create `apps/server/prisma/schema.prisma` with ALL models from the tech spec. Critical details:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USERS ───

model User {
  id              String    @id @default(uuid()) @db.Uuid
  email           String    @unique @db.VarChar(255)
  passwordHash    String?   @map("password_hash") @db.VarChar(255)
  name            String    @db.VarChar(100)
  avatarUrl       String?   @map("avatar_url") @db.VarChar(500)
  defaultCurrency String    @default("INR") @map("default_currency") @db.VarChar(3)
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  groupMemberships    GroupMember[]
  expensesPaid        Expense[]      @relation("PaidBy")
  expenseSplits       ExpenseSplit[]
  settlementsPaid     Settlement[]   @relation("SettlementPaidBy")
  settlementsReceived Settlement[]   @relation("SettlementPaidTo")
  notifications       Notification[]
  createdGroups       Group[]        @relation("GroupCreator")
  accounts            Account[]

  @@map("users")
}

model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @map("user_id") @db.Uuid
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refreshToken      String? @map("refresh_token") @db.Text
  accessToken       String? @map("access_token") @db.Text
  expiresAt         Int?    @map("expires_at")
  tokenType         String? @map("token_type")
  scope             String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// ─── GROUPS ───

model Group {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(500)
  createdById String   @map("created_by") @db.Uuid
  inviteCode  String   @unique @map("invite_code") @db.VarChar(12)
  isArchived  Boolean  @default(false) @map("is_archived")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  createdBy   User           @relation("GroupCreator", fields: [createdById], references: [id])
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]

  @@index([inviteCode])
  @@map("groups")
}

enum GroupRole {
  ADMIN
  MEMBER
}

model GroupMember {
  id       String    @id @default(uuid()) @db.Uuid
  groupId  String    @map("group_id") @db.Uuid
  userId   String    @map("user_id") @db.Uuid
  role     GroupRole @default(MEMBER)
  joinedAt DateTime  @default(now()) @map("joined_at") @db.Timestamptz

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
  @@map("group_members")
}

// ─── NON-USER PARTICIPANTS ───

model Participant {
  id           String   @id @default(uuid()) @db.Uuid
  name         String   @db.VarChar(100)
  email        String?  @db.VarChar(255)
  phone        String?  @db.VarChar(20)
  linkedUserId String?  @map("linked_user_id") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  expenseSplits ExpenseSplit[]

  @@index([email])
  @@index([linkedUserId])
  @@map("participants")
}

// ─── EXPENSES ───

enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARES
}

model Expense {
  id             String    @id @default(uuid()) @db.Uuid
  groupId        String    @map("group_id") @db.Uuid
  paidById       String    @map("paid_by") @db.Uuid
  amountInPaise  Int       @map("amount_in_paise")
  currency       String    @default("INR") @db.VarChar(3)
  description    String    @db.VarChar(500)
  category       String?   @db.VarChar(50)
  tags           String[]  @default([])
  splitType      SplitType @map("split_type")
  date           DateTime  @db.Date
  receiptUrl     String?   @map("receipt_url") @db.VarChar(500)
  idempotencyKey String?   @unique @map("idempotency_key") @db.VarChar(64)
  isRecurring    Boolean   @default(false) @map("is_recurring")
  recurrenceRule String?   @map("recurrence_rule") @db.VarChar(255)
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  group  Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy User           @relation("PaidBy", fields: [paidById], references: [id])
  splits ExpenseSplit[]

  @@index([groupId, date])
  @@index([groupId, category])
  @@index([paidById])
  @@map("expenses")
}

model ExpenseSplit {
  id                String  @id @default(uuid()) @db.Uuid
  expenseId         String  @map("expense_id") @db.Uuid
  userId            String? @map("user_id") @db.Uuid
  participantId     String? @map("participant_id") @db.Uuid
  owedAmountInPaise Int     @map("owed_amount_in_paise")
  shareValue        Float?  @map("share_value")

  expense     Expense      @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user        User?        @relation(fields: [userId], references: [id])
  participant Participant? @relation(fields: [participantId], references: [id])

  @@index([expenseId])
  @@index([userId])
  @@index([participantId])
  @@map("expense_splits")
}

// ─── SETTLEMENTS ───

model Settlement {
  id            String   @id @default(uuid()) @db.Uuid
  groupId       String   @map("group_id") @db.Uuid
  paidById      String   @map("paid_by") @db.Uuid
  paidToId      String   @map("paid_to") @db.Uuid
  amountInPaise Int      @map("amount_in_paise")
  note          String?  @db.VarChar(500)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  group  Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy User  @relation("SettlementPaidBy", fields: [paidById], references: [id])
  paidTo User  @relation("SettlementPaidTo", fields: [paidToId], references: [id])

  @@index([groupId])
  @@index([paidById])
  @@index([paidToId])
  @@map("settlements")
}

// ─── NOTIFICATIONS ───

enum NotificationType {
  EXPENSE_ADDED
  EXPENSE_UPDATED
  EXPENSE_DELETED
  SETTLEMENT_RECEIVED
  GROUP_INVITE
  REMINDER
}

model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  body      String           @db.VarChar(500)
  metadata  Json?            @db.JsonB
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

## Step 4: Create .env for apps/server

Create `apps/server/.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

## Step 5: Run Migration

```bash
cd apps/server
npx prisma migrate dev --name init
```

## Step 6: Create Seed Script

Create `apps/server/prisma/seed.ts`:

```typescript
import { PrismaClient, GroupRole, SplitType } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users (password hash is for "password123" using bcrypt cost 12)
  const passwordHash = '$2b$12$LJ3m4ys3GZxkFfmTST8tKeTG0rRzIPhHOG0Zl9G.qyXMq7v7z5HCe';

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: 'Marcus Chen',
      email: 'marcus@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const sana = await prisma.user.create({
    data: {
      name: 'Sana Patel',
      email: 'sana@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const dev = await prisma.user.create({
    data: {
      name: 'Dev Garg',
      email: 'dev@demo.kharcha.app',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  // Create demo group
  const goaTrip = await prisma.group.create({
    data: {
      name: 'Goa Trip 2026',
      description: 'Annual beach trip with friends',
      createdById: priya.id,
      inviteCode: 'GOA2026ABC',
    },
  });

  // Add members
  await prisma.groupMember.createMany({
    data: [
      { groupId: goaTrip.id, userId: priya.id, role: GroupRole.ADMIN },
      { groupId: goaTrip.id, userId: marcus.id, role: GroupRole.MEMBER },
      { groupId: goaTrip.id, userId: sana.id, role: GroupRole.MEMBER },
      { groupId: goaTrip.id, userId: dev.id, role: GroupRole.MEMBER },
    ],
  });

  // Create sample expenses with splits
  // Expense 1: Dinner (equal split, 4 people, ₹3500)
  const expense1 = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: priya.id,
      amountInPaise: 350000,
      description: 'Dinner at Olive Bar',
      category: 'food',
      splitType: SplitType.EQUAL,
      date: new Date('2026-03-25'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense1.id, userId: priya.id, owedAmountInPaise: 87500 },
      { expenseId: expense1.id, userId: marcus.id, owedAmountInPaise: 87500 },
      { expenseId: expense1.id, userId: sana.id, owedAmountInPaise: 87500 },
      { expenseId: expense1.id, userId: dev.id, owedAmountInPaise: 87500 },
    ],
  });

  // Expense 2: Hotel (equal split, ₹12000)
  const expense2 = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: marcus.id,
      amountInPaise: 1200000,
      description: 'Hotel for 2 nights',
      category: 'accommodation',
      splitType: SplitType.EQUAL,
      date: new Date('2026-03-24'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense2.id, userId: priya.id, owedAmountInPaise: 300000 },
      { expenseId: expense2.id, userId: marcus.id, owedAmountInPaise: 300000 },
      { expenseId: expense2.id, userId: sana.id, owedAmountInPaise: 300000 },
      { expenseId: expense2.id, userId: dev.id, owedAmountInPaise: 300000 },
    ],
  });

  // Expense 3: Cab (shares split 2:1:1:0 — Dev didn't ride)
  const expense3 = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      paidById: sana.id,
      amountInPaise: 80000,
      description: 'Airport cab',
      category: 'transport',
      splitType: SplitType.SHARES,
      date: new Date('2026-03-24'),
    },
  });

  await prisma.expenseSplit.createMany({
    data: [
      { expenseId: expense3.id, userId: priya.id, owedAmountInPaise: 40000, shareValue: 2 },
      { expenseId: expense3.id, userId: marcus.id, owedAmountInPaise: 20000, shareValue: 1 },
      { expenseId: expense3.id, userId: sana.id, owedAmountInPaise: 20000, shareValue: 1 },
    ],
  });

  // Create a sample settlement
  await prisma.settlement.create({
    data: {
      groupId: goaTrip.id,
      paidById: dev.id,
      paidToId: priya.id,
      amountInPaise: 100000,
      note: 'Partial settlement for trip expenses',
    },
  });

  console.log('Seed data created successfully!');
  console.log(`  Users: ${priya.name}, ${marcus.name}, ${sana.name}, ${dev.name}`);
  console.log(`  Group: ${goaTrip.name} (invite code: ${goaTrip.inviteCode})`);
  console.log(`  Expenses: 3 sample expenses`);
  console.log(`  Settlements: 1 sample settlement`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Add to `apps/server/package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Install ts-node: `pnpm --filter @kharcha/server add -D ts-node`

Run seed: `cd apps/server && npx prisma db seed`

# REQUIREMENTS
- ALL monetary amounts use integer fields (`Int` in Prisma, not `Decimal` or `Float`)
- Field names in schema use camelCase but `@@map` to snake_case table/column names
- UUIDs for all primary keys
- `Timestamptz` for all datetime fields
- Composite unique constraint on `GroupMember(groupId, userId)`
- Indexes on all foreign keys and common query patterns

# CONVENTIONS
- Schema file location: `apps/server/prisma/schema.prisma`
- Seed file location: `apps/server/prisma/seed.ts`
- Use `@map` for column names, `@@map` for table names (snake_case in DB)
- camelCase in Prisma model fields

# VALIDATION
When done, verify:
- [ ] `npx prisma migrate dev` applies cleanly (no errors)
- [ ] `npx prisma db seed` populates all demo data
- [ ] `npx prisma studio` opens and shows all tables with correct data
- [ ] All amount columns are integers (verify in Prisma Studio or `\d expenses` in psql)
</prompt>

---

### Phase 2: NestJS Bootstrap
**Goal:** Bootstrap the NestJS application with Prisma, Redis, health check, global pipes/filters/interceptors, and Swagger docs.
**Depends on:** Phase 0, Phase 1

#### Prompt:

<prompt>
# CONTEXT
You are working in a Turborepo monorepo for the Kharcha expense splitting app.
- `apps/server` — NestJS modular monolith (backend API) — `@kharcha/server`
- Database: PostgreSQL via Docker (port 54322)
- Redis: standalone on port 6379
- Prisma schema and migrations already exist in `apps/server/prisma/schema.prisma`

# EXPLORATION (do this FIRST)
1. Read `apps/server/package.json` to see what's already installed
2. Read `apps/server/prisma/schema.prisma` to confirm schema exists
3. Check `apps/server/src/` for any existing files
4. Read `packages/shared/src/types/api-response.ts` for the response envelope types

# TASK
Bootstrap the NestJS server with all core infrastructure.

## Step 1: Install Dependencies

```bash
pnpm --filter @kharcha/server add \
  @nestjs/core @nestjs/common @nestjs/platform-express \
  @nestjs/swagger @nestjs/throttler @nestjs/config \
  @nestjs/event-emitter \
  @prisma/client ioredis \
  class-validator class-transformer \
  helmet \
  reflect-metadata rxjs
```

## Step 2: Create PrismaModule

**`apps/server/src/prisma/prisma.service.ts`:**
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**`apps/server/src/prisma/prisma.module.ts`:**
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## Step 3: Create RedisModule

**`apps/server/src/redis/redis.service.ts`:**
```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    super(redisUrl);
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
```

**`apps/server/src/redis/redis.module.ts`:**
```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

## Step 4: Create Global Infrastructure

**`apps/server/src/common/pipes/validation.pipe.ts`:**
Global ValidationPipe with `whitelist: true, forbidNonWhitelisted: true, transform: true`.

**`apps/server/src/common/filters/http-exception.filter.ts`:**
Catches all HttpExceptions and formats them as:
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": {} } }
```

**`apps/server/src/common/interceptors/transform.interceptor.ts`:**
Wraps all successful responses in:
```json
{ "success": true, "data": <original response> }
```
(Don't double-wrap if response already has `success` key.)

**`apps/server/src/common/interceptors/logging.interceptor.ts`:**
Logs method, URL, status code, and response time for every request.

**`apps/server/src/common/dto/pagination.dto.ts`:**
```typescript
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
```

## Step 5: Create AppModule

**`apps/server/src/app.module.ts`:**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

**`apps/server/src/health.controller.ts`:**
```typescript
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

## Step 6: Create main.ts

**`apps/server/src/main.ts`:**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Kharcha API')
    .setDescription('Expense splitting & tracking API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`Kharcha API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
```

# REQUIREMENTS
- PrismaModule and RedisModule must be @Global() so all modules can inject them
- All responses wrapped in `{ success: true, data: ... }` envelope (transform interceptor)
- All errors wrapped in `{ success: false, error: { code, message, details } }` (exception filter)
- Rate limiting: 100 req/min globally
- Helmet security headers enabled
- CORS configured from env var

# CONVENTIONS
- NestJS file naming: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.guard.ts`, etc.
- Controllers use `@Controller('route-name')` decorator
- Services use `@Injectable()` decorator
- Folder structure: `src/common/` for shared infra, `src/modules/` for domain modules, `src/prisma/` and `src/redis/` for data access
- Import from `@kharcha/shared` for shared types

# VALIDATION
When done, verify:
- [ ] `pnpm --filter @kharcha/server start:dev` starts server on port 3001
- [ ] `curl http://localhost:3001/health` returns `{ "success": true, "data": { "status": "ok", "timestamp": "..." } }`
- [ ] `http://localhost:3001/api/docs` shows Swagger UI
- [ ] Server logs show "Kharcha API running on http://localhost:3001"
- [ ] No unhandled promise rejections (Prisma connects, Redis connects)
</prompt>

---

### Phase 3: Auth Module
**Goal:** Implement credential-based auth with JWT on NestJS and NextAuth v5 on the client.
**Depends on:** Phase 2

#### Prompt:

<prompt>
# CONTEXT
You are working in a Turborepo monorepo for the Kharcha expense splitting app.
- `apps/server` — NestJS API with Prisma and Redis already configured
- `apps/client` — Next.js 14+ App Router (minimal stub)
- `packages/shared` — Has types for `RegisterRequest`, `LoginRequest`, `AuthResponse`, `User`
- Auth strategy: NextAuth v5 on client, NestJS JWT on server
- Flow: Browser → NextAuth (session cookie) → BFF Route Handlers → NestJS API (JWT Bearer)

# EXPLORATION (do this FIRST)
1. Read `apps/server/src/app.module.ts` to see current module structure
2. Read `packages/shared/src/types/user.ts` for auth-related types
3. Read `apps/server/prisma/schema.prisma` to see User and Account models
4. Check `apps/client/package.json` for current dependencies

# TASK
Build the complete authentication flow.

## Server-Side (NestJS)

### Install deps:
```bash
pnpm --filter @kharcha/server add @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt nanoid
pnpm --filter @kharcha/server add -D @types/passport-jwt @types/bcrypt
```

### Auth Module files to create:

**`apps/server/src/modules/auth/auth.module.ts`** — imports PassportModule, JwtModule (secret from env, expiresIn: '7d'), provides AuthService, JwtStrategy

**`apps/server/src/modules/auth/auth.controller.ts`:**
- `POST /auth/register` — body: `{ email, password, name }` → creates user (bcrypt hash, cost 12), returns JWT + user
- `POST /auth/login` — body: `{ email, password }` → validates credentials, returns JWT + user
- `GET /auth/me` — `@UseGuards(JwtAuthGuard)` → returns current user from JWT

**`apps/server/src/modules/auth/auth.service.ts`:**
- `register(dto)`: Check email uniqueness, hash password (bcrypt cost 12), create user, generate JWT
- `login(dto)`: Find user by email, compare password, generate JWT
- `validateUser(userId)`: Find user by ID (used by JWT strategy)

**`apps/server/src/modules/auth/strategies/jwt.strategy.ts`:**
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return user;
  }
}
```

**`apps/server/src/modules/auth/dto/register.dto.ts`:**
```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}
```

**`apps/server/src/modules/auth/dto/login.dto.ts`:**
```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

**`apps/server/src/common/guards/jwt-auth.guard.ts`:**
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**`apps/server/src/common/decorators/current-user.decorator.ts`:**
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

Register AuthModule in AppModule's imports.

## Client-Side (NextAuth v5)

### Install deps:
```bash
pnpm --filter @kharcha/client add next-auth@beta @auth/prisma-adapter
pnpm --filter @kharcha/client add zod
```

**`apps/client/lib/auth.ts`:**
Configure NextAuth with:
- Credentials provider (email + password → calls NestJS `POST /auth/login` → returns user)
- Google provider (client ID + secret from env)
- JWT session strategy (maxAge: 7 days)
- Callbacks: jwt (attach userId), session (attach userId)
- The Credentials `authorize` function should call the NestJS API to validate credentials and return the user object

**`apps/client/app/api/auth/[...nextauth]/route.ts`:**
Export GET and POST handlers from the auth config.

**`apps/client/lib/api-client.ts`:**
Create a typed fetch wrapper that:
- Reads the NextAuth session for the JWT
- Attaches it as `Authorization: Bearer <token>` to all NestJS API calls
- Base URL from `API_URL` env var (default `http://localhost:3001`)
- Handles error responses

**`apps/client/app/(auth)/login/page.tsx`:**
Simple login form with email/password fields, "Sign in with Google" button, link to register.

**`apps/client/app/(auth)/register/page.tsx`:**
Simple registration form with name, email, password fields.

**`apps/client/app/(auth)/layout.tsx`:**
Auth layout (centered card on page).

# REQUIREMENTS
- Passwords hashed with bcrypt cost factor 12
- JWT payload: `{ sub: userId }` — minimal claims
- JWT expiry: 7 days
- All auth endpoints return the envelope format `{ success: true, data: { accessToken, user } }`
- Email uniqueness enforced at both validation and DB level
- NestJS auth endpoints (`/auth/register`, `/auth/login`) are public (no guard)
- `GET /auth/me` requires JwtAuthGuard

# CONVENTIONS
- Import guards from `src/common/guards/`
- Import decorators from `src/common/decorators/`
- Module structure: `modules/auth/` with auth.module.ts, auth.controller.ts, auth.service.ts, strategies/, dto/

# VALIDATION
When done, verify:
- [ ] `POST http://localhost:3001/auth/register` with `{ "email": "test@test.com", "password": "password123", "name": "Test" }` returns 201 with JWT
- [ ] `POST http://localhost:3001/auth/login` with same credentials returns 200 with JWT
- [ ] `GET http://localhost:3001/auth/me` with `Authorization: Bearer <token>` returns user profile
- [ ] `GET http://localhost:3001/auth/me` without token returns 401
- [ ] NextAuth sign-in page renders at `http://localhost:3000/login`
- [ ] `pnpm turbo build` succeeds
</prompt>

---

### Phase 4: User Module
**Goal:** Implement user profile CRUD and aggregate balance summary.
**Depends on:** Phase 3

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Auth module is complete — JWT guards and `@CurrentUser()` decorator available
- Prisma User model exists with fields: id, email, passwordHash, name, avatarUrl, defaultCurrency, isActive
- Shared types: `UpdateUserRequest`, `UserSummary` in `@kharcha/shared`

# EXPLORATION (do this FIRST)
1. Read `apps/server/src/modules/auth/auth.module.ts` to see how modules are structured
2. Read `packages/shared/src/types/user.ts` for UpdateUserRequest and UserSummary types
3. Read `apps/server/src/common/decorators/current-user.decorator.ts` to confirm it exists
4. Read `apps/server/src/app.module.ts` for current imports

# TASK
Build the User module on the server and settings page on the client.

## Server: User Module

**`apps/server/src/modules/user/user.module.ts`** — provides UserService, UserController

**`apps/server/src/modules/user/user.controller.ts`:**
- `PATCH /users/me` — `@UseGuards(JwtAuthGuard)` — update name, avatarUrl, defaultCurrency
- `GET /users/me/summary` — `@UseGuards(JwtAuthGuard)` — returns aggregate balance across all groups

**`apps/server/src/modules/user/user.service.ts`:**
- `updateProfile(userId, dto)`: Update only provided fields
- `getUserSummary(userId)`: Query all groups the user belongs to, compute net balance per group (totalPaid - totalOwed + settlementsReceived - settlementsPaid), return aggregate

**`apps/server/src/modules/user/dto/update-user.dto.ts`:**
```typescript
import { IsOptional, IsString, MaxLength, IsUrl, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  defaultCurrency?: string;
}
```

For `getUserSummary`, the query should:
1. Find all groups where user is a member
2. For each group, compute: sum(expenses.amountInPaise where paidBy=user) - sum(splits.owedAmountInPaise where userId=user) + sum(settlements received) - sum(settlements paid)
3. Return totalOwedInPaise (sum of positive nets), totalOwingInPaise (sum of negative nets), and per-group breakdown

Register UserModule in AppModule.

## Client: Settings Page

**`apps/client/app/(dashboard)/settings/page.tsx`:**
- Fetch current user profile
- Form to edit name, default currency
- Save button calls `PATCH /users/me` via API client

Create a minimal `apps/client/app/(dashboard)/layout.tsx` if it doesn't exist.

# REQUIREMENTS
- Only the authenticated user can modify their own profile (no other user's profile)
- `defaultCurrency` must be a valid 3-letter ISO code
- UserSummary amounts are in paise (integer)
- Don't allow updating email or password from this endpoint (separate flows for those)

# CONVENTIONS
- Same module structure as auth: `modules/user/user.module.ts`, `user.controller.ts`, `user.service.ts`, `dto/`
- Use `@CurrentUser()` decorator to get the authenticated user
- Import types from `@kharcha/shared`

# VALIDATION
When done, verify:
- [ ] `PATCH http://localhost:3001/users/me` with Bearer token and `{ "name": "New Name" }` returns updated user
- [ ] `GET http://localhost:3001/users/me/summary` returns `{ totalOwedInPaise, totalOwingInPaise, groups: [...] }`
- [ ] Invalid currency code (e.g., "invalid") returns 400
- [ ] Settings page loads at `http://localhost:3000/settings`
</prompt>

---

### Phase 5: Group Module
**Goal:** Implement group CRUD, invite link generation, join flow, and GroupMemberGuard.
**Depends on:** Phase 3, Phase 4

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Auth + User modules complete. JWT guards, `@CurrentUser()` decorator, PrismaService all available.
- Prisma models: Group, GroupMember (with GroupRole enum: ADMIN, MEMBER)
- Shared types in `@kharcha/shared`: `Group`, `GroupMember`, `CreateGroupRequest`, `UpdateGroupRequest`, `GroupWithMembers`, `GroupRole`

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/types/group.ts` for group-related types
2. Read `apps/server/prisma/schema.prisma` — review Group and GroupMember models
3. Read `apps/server/src/common/guards/jwt-auth.guard.ts` for guard pattern
4. Read `apps/server/src/app.module.ts` for current module imports

# TASK
Build the Group module on the server and group UI on the client.

## Server: Group Module

### Install nanoid:
```bash
pnpm --filter @kharcha/server add nanoid
```

**`apps/server/src/modules/group/group.module.ts`**
**`apps/server/src/modules/group/group.controller.ts`:**
- `POST /groups` — JWT — Create group (user becomes ADMIN member automatically), generate invite code with `nanoid(10)`
- `GET /groups` — JWT — List all groups where user is a member (include member count)
- `GET /groups/:groupId` — JWT + GroupMemberGuard — Group detail with member list (include user info)
- `PATCH /groups/:groupId` — JWT + GroupMemberGuard + ADMIN role check — Update name/description
- `POST /groups/:groupId/archive` — JWT + GroupMemberGuard + ADMIN — Set isArchived=true
- `GET /groups/:groupId/invite` — JWT + GroupMemberGuard — Return invite code (optionally regenerate)
- `POST /groups/join/:inviteCode` — JWT — Find group by invite code, add user as MEMBER (reject if already member or archived)

**`apps/server/src/modules/group/group.service.ts`:**
- `createGroup(userId, dto)`: Create group + GroupMember (ADMIN) in transaction
- `listUserGroups(userId)`: Find all groups where user is member, include member count
- `getGroupDetail(groupId)`: Include members with user info
- `updateGroup(groupId, dto)`: Update name/description
- `archiveGroup(groupId)`: Set isArchived
- `getInviteCode(groupId)`: Return current invite code
- `regenerateInviteCode(groupId)`: Generate new nanoid(10) and update
- `joinGroup(userId, inviteCode)`: Find group by inviteCode, validate not archived/already member, add as MEMBER

**`apps/server/src/common/guards/group-member.guard.ts`:**
```typescript
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const groupId = request.params.groupId;

    if (!userId || !groupId) return false;

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) throw new ForbiddenException('Not a group member');

    request.groupRole = membership.role;
    return true;
  }
}
```

**`apps/server/src/common/decorators/group-role.decorator.ts`:**
Custom decorator or guard that checks `request.groupRole` against required role.

Create DTOs:
- `create-group.dto.ts` (name required, description optional)
- `update-group.dto.ts` (name optional, description optional)

Register GroupModule in AppModule.

## Client: Group Pages

**`apps/client/app/(dashboard)/groups/page.tsx`** — List groups with cards
**`apps/client/app/(dashboard)/groups/new/page.tsx`** — Create group form
**`apps/client/app/(dashboard)/groups/[groupId]/page.tsx`** — Group detail with member list and tabs
**`apps/client/components/groups/group-card.tsx`** — Card showing group name, member count, archived badge
**`apps/client/components/groups/group-form.tsx`** — Name + description form
**`apps/client/components/groups/invite-dialog.tsx`** — Shows invite link, copy button
**`apps/client/components/groups/member-list.tsx`** — Lists members with role badges
**`apps/client/hooks/use-groups.ts`** — TanStack Query hooks for groups

Install TanStack Query if not already:
```bash
pnpm --filter @kharcha/client add @tanstack/react-query
```

# REQUIREMENTS
- Creator automatically becomes ADMIN of the group
- Invite codes are 10-character nanoid strings (URL-safe)
- Only ADMINs can update group name/description or archive
- Any member can view invite code
- Joining an archived group is rejected (400)
- Joining a group you're already in is rejected (409)
- GroupMemberGuard must be applied to all group-scoped routes (except join)

# CONVENTIONS
- Group-scoped routes pattern: `/groups/:groupId/...`
- Guards applied: `@UseGuards(JwtAuthGuard, GroupMemberGuard)` for member-only routes
- Role check via decorator or inline guard

# VALIDATION
When done, verify:
- [ ] `POST /groups` creates a group and auto-adds creator as ADMIN
- [ ] `GET /groups` returns only groups where user is a member
- [ ] `POST /groups/join/:inviteCode` successfully adds user to group
- [ ] Non-members get 403 on `GET /groups/:groupId`
- [ ] Client shows group list, create form, and group detail with members
- [ ] Invite dialog shows copyable link
</prompt>

---

### Phase 6: Expense Module
**Goal:** Implement expense CRUD with all 4 split types, cursor-based pagination, and client UI.
**Depends on:** Phase 5

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Group module complete — GroupMemberGuard available for authorization
- `packages/shared` exports `calculateSplit()` from `utils/split.ts` — this is the split calculation engine
- Prisma models: Expense, ExpenseSplit with integer amount fields (amountInPaise, owedAmountInPaise)
- Shared types: `CreateExpenseRequest`, `Expense`, `ExpenseSplitResponse`, `ExpenseFilterParams`, `SplitType`

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/utils/split.ts` to understand the split calculator
2. Read `packages/shared/src/types/expense.ts` for expense-related types
3. Read `apps/server/prisma/schema.prisma` — review Expense and ExpenseSplit models
4. Read `apps/server/src/common/guards/group-member.guard.ts` for the guard pattern
5. Read `apps/server/src/common/dto/pagination.dto.ts` for pagination pattern

# TASK
Build the Expense module with all 4 split types and cursor-based pagination.

## Server: Expense Module

**`apps/server/src/modules/expense/expense.module.ts`**

**`apps/server/src/modules/expense/expense.controller.ts`:**
- `POST /groups/:groupId/expenses` — JWT + GroupMemberGuard — Create expense with splits
- `GET /groups/:groupId/expenses` — JWT + GroupMemberGuard — List expenses (filterable, cursor-paginated)
- `GET /groups/:groupId/expenses/:expenseId` — JWT + GroupMemberGuard — Expense detail with splits
- `PATCH /groups/:groupId/expenses/:expenseId` — JWT + GroupMemberGuard — Update (creator or admin only)
- `DELETE /groups/:groupId/expenses/:expenseId` — JWT + GroupMemberGuard — Soft-delete (creator or admin only)

**`apps/server/src/modules/expense/expense.service.ts`:**

**Create expense logic:**
1. Validate idempotency key — if exists, return existing expense
2. Validate paidById is a group member
3. Validate all split userIds are group members
4. Call `calculateSplit()` from `@kharcha/shared` to compute split amounts
5. Create Expense + ExpenseSplits in a Prisma transaction
6. Emit `expense.created` event (for balance cache invalidation + notifications later)

**List expenses logic:**
- Filter by: category, date range (from/to), paidBy, splitWith (user appears in splits), search (description ILIKE)
- Cursor-based pagination: use `expenseId` as cursor, `pageSize` default 20
- Sort by date descending (default)
- Include payer name in response

**`apps/server/src/modules/expense/split-calculator.service.ts`:**
Thin wrapper around `calculateSplit` from `@kharcha/shared` — validates inputs, handles Prisma-specific concerns.

**`apps/server/src/modules/expense/dto/create-expense.dto.ts`:**
```typescript
import { IsInt, IsPositive, IsString, IsEnum, IsArray, IsOptional, IsDateString, MaxLength, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class SplitEntryDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsInt()
  value?: number;
}

export class CreateExpenseDto {
  @IsInt()
  @IsPositive()
  amountInPaise: number;

  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsEnum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'])
  splitType: string;

  @IsDateString()
  date: string;

  @IsUUID()
  paidById: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  splits: SplitEntryDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}
```

**`apps/server/src/modules/expense/dto/expense-filter.dto.ts`:**
Extends PaginationDto with optional: category, from, to, paidBy, splitWith, search, sort.

Register ExpenseModule in AppModule. Wire up EventEmitter for `expense.created` event.

## Client: Expense UI

**`apps/client/components/expenses/expense-form.tsx`:**
- Amount input (display in rupees, convert to paise on submit)
- Description, category dropdown (from `EXPENSE_CATEGORIES` constant in shared)
- Date picker
- Split type selector (tabs: Equal / Exact / Percentage / Shares)
- For EQUAL: just show participant checkboxes
- For EXACT: show amount input per participant (must sum to total)
- For PERCENTAGE: show percentage input per participant (must sum to 100)
- For SHARES: show share input per participant

**`apps/client/components/expenses/split-selector.tsx`:**
The split type specific inputs — switches based on selected type.

**`apps/client/components/expenses/expense-list.tsx`:**
- Infinite scroll or "load more" using TanStack Query's useInfiniteQuery
- Each expense card shows: description, amount, payer, date, category badge

**`apps/client/components/expenses/expense-card.tsx`:**
- Compact card: description, formatted amount (from paise), payer name, date, split type icon

**`apps/client/hooks/use-expenses.ts`:**
- `useExpenses(groupId, filters)` — useInfiniteQuery with cursor-based pagination
- `useCreateExpense(groupId)` — useMutation
- `useExpenseDetail(groupId, expenseId)` — useQuery

# REQUIREMENTS
- ALL amounts stored and transmitted as integers (paise). Display layer converts using `formatCurrency()` from `@kharcha/shared`
- Split calculation uses `calculateSplit()` from `packages/shared/src/utils/split.ts` — do NOT reimplement
- Idempotency: if `idempotencyKey` matches an existing expense, return that expense (don't create duplicate)
- Cursor-based pagination: `cursor` = last expense ID, `pageSize` = number of items
- All split userIds must be verified as group members before creating
- Emit event via EventEmitter on expense create/update/delete

# CONVENTIONS
- Integer money everywhere. Client converts to display: `import { formatCurrency, toPaise } from '@kharcha/shared'`
- Expense routes nested under groups: `/groups/:groupId/expenses`
- Use `@UseGuards(JwtAuthGuard, GroupMemberGuard)` on all endpoints

# VALIDATION
When done, verify:
- [ ] Create expense with EQUAL split among 3 people — splits sum to total
- [ ] Create expense with EXACT split — rejects if amounts don't sum to total
- [ ] Create expense with PERCENTAGE split — rejects if percentages don't sum to 100
- [ ] Create expense with SHARES split (2:1:1) — correct proportional splits
- [ ] Duplicate idempotency key returns existing expense (200, not 201)
- [ ] `GET /groups/:groupId/expenses?cursor=<id>&pageSize=5` returns next 5 expenses
- [ ] Client expense form works for all 4 split types
- [ ] `pnpm turbo build` succeeds
</prompt>

---

### Phase 7: Balance Module
**Goal:** Implement balance computation, Redis caching, and debt simplification algorithm.
**Depends on:** Phase 6

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Expense module complete — expenses and splits exist in DB
- Redis service available globally
- EventEmitter configured — expense events can be listened to
- Shared types: `BalanceResponse`, `SimplifiedBalanceResponse`, `NetBalance`, `SimplifiedSettlement`, `PairwiseBalance`

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/types/balance.ts` for balance types
2. Read `apps/server/src/redis/redis.service.ts` for Redis API
3. Read `apps/server/prisma/schema.prisma` — review Expense, ExpenseSplit, Settlement models and their indexes
4. Grep for `EventEmitter` usage in the expense module to see event patterns

# TASK
Build the Balance module with caching and debt simplification.

## Server: Balance Module

**`apps/server/src/modules/balance/balance.module.ts`**

**`apps/server/src/modules/balance/balance.controller.ts`:**
- `GET /groups/:groupId/balances` — JWT + GroupMemberGuard — Raw pairwise balances
- `GET /groups/:groupId/balances/simplified` — JWT + GroupMemberGuard — Simplified settlement plan

**`apps/server/src/modules/balance/balance.service.ts`:**

```typescript
@Injectable()
export class BalanceService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getGroupBalances(groupId: string): Promise<BalanceResponse> {
    const cacheKey = `balances:${groupId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const balances = await this.computeFromDB(groupId);
    await this.redis.set(cacheKey, JSON.stringify(balances), 'EX', 300);
    return balances;
  }

  async getSimplifiedBalances(groupId: string): Promise<SimplifiedBalanceResponse> {
    const cacheKey = `balances:simplified:${groupId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rawBalances = await this.getGroupBalances(groupId);
    const netBalances = this.computeNetBalances(rawBalances);
    const simplified = simplifyDebts(netBalances);

    // Enrich with user names
    const userIds = [...new Set(simplified.flatMap(s => [s.fromUserId, s.toUserId]))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const result: SimplifiedBalanceResponse = {
      groupId,
      settlements: simplified.map(s => ({
        from: { id: s.fromUserId, name: userMap.get(s.fromUserId) || 'Unknown' },
        to: { id: s.toUserId, name: userMap.get(s.toUserId) || 'Unknown' },
        amountInPaise: s.amountInPaise,
      })),
      originalTransactionCount: rawBalances.balances.length,
      simplifiedTransactionCount: simplified.length,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    return result;
  }

  async invalidateCache(groupId: string): Promise<void> {
    await this.redis.del(`balances:${groupId}`);
    await this.redis.del(`balances:simplified:${groupId}`);
  }

  private async computeFromDB(groupId: string): Promise<BalanceResponse> {
    // Step 1: For each user, compute total amount they PAID (from expenses)
    // Step 2: For each user, compute total amount they OWE (from expense_splits)
    // Step 3: For each user pair, compute settlements between them
    // Step 4: Net balance per pair = paid - owed + settlements received - settlements paid
    // Return pairwise balances where amount > 0

    // Use raw SQL for efficiency:
    // ... (implement the queries from the tech spec section 7.3)
  }
}
```

**`apps/server/src/modules/balance/simplify.service.ts`:**

Implement the debt simplification algorithm from the tech spec:

```typescript
export interface InternalNetBalance {
  userId: string;
  netInPaise: number;
}

export interface InternalSimplifiedSettlement {
  fromUserId: string;
  toUserId: string;
  amountInPaise: number;
}

export function simplifyDebts(netBalances: InternalNetBalance[]): InternalSimplifiedSettlement[] {
  // Validate zero-sum invariant
  const sum = netBalances.reduce((s, b) => s + b.netInPaise, 0);
  if (sum !== 0) {
    throw new Error(`Balance invariant violated: sum = ${sum}, expected 0`);
  }

  const creditors: InternalNetBalance[] = [];
  const debtors: InternalNetBalance[] = [];

  for (const b of netBalances) {
    if (b.netInPaise > 0) creditors.push({ ...b });
    else if (b.netInPaise < 0) debtors.push({ ...b, netInPaise: -b.netInPaise });
  }

  creditors.sort((a, b) => b.netInPaise - a.netInPaise);
  debtors.sort((a, b) => b.netInPaise - a.netInPaise);

  const settlements: InternalSimplifiedSettlement[] = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].netInPaise, debtors[di].netInPaise);

    settlements.push({
      fromUserId: debtors[di].userId,
      toUserId: creditors[ci].userId,
      amountInPaise: amount,
    });

    creditors[ci].netInPaise -= amount;
    debtors[di].netInPaise -= amount;

    if (creditors[ci].netInPaise === 0) ci++;
    if (debtors[di].netInPaise === 0) di++;
  }

  return settlements;
}
```

### Event Listener for Cache Invalidation:

```typescript
@OnEvent('expense.created')
@OnEvent('expense.updated')
@OnEvent('expense.deleted')
async handleExpenseChange(payload: { groupId: string }) {
  await this.invalidateCache(payload.groupId);
}
```

Register BalanceModule in AppModule.

# REQUIREMENTS
- Balance computation must account for: expenses paid, expense splits owed, settlements paid, settlements received
- Net balance formula: totalPaid - totalOwed + settlementsReceived - settlementsPaid
- Cache TTL: 5 minutes (300 seconds)
- Cache invalidated immediately on expense/settlement writes
- Simplification algorithm must maintain zero-sum invariant
- All amounts in paise (integers)

# CONVENTIONS
- Cache keys: `balances:{groupId}`, `balances:simplified:{groupId}`
- Use `@OnEvent()` decorator for event listeners
- Put simplifyDebts as a standalone exported function (testable without NestJS DI)

# VALIDATION
When done, verify:
- [ ] `GET /groups/:groupId/balances` returns correct pairwise balances for seeded data
- [ ] `GET /groups/:groupId/balances/simplified` returns fewer transactions than raw
- [ ] Second call to balances endpoint is served from Redis cache (verify with logging or Redis MONITOR)
- [ ] Creating a new expense invalidates the cache (next balance call computes fresh)
- [ ] Zero-sum invariant: sum of all net balances = 0
</prompt>

---

### Phase 8: Settlement Module
**Goal:** Implement settlement recording with balance cache invalidation.
**Depends on:** Phase 7

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Balance module complete with cache invalidation via EventEmitter
- Shared types: `CreateSettlementRequest`, `Settlement` in `@kharcha/shared`
- Prisma Settlement model with integer amountInPaise

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/types/settlement.ts` for types
2. Read `apps/server/prisma/schema.prisma` — review Settlement model
3. Read `apps/server/src/modules/balance/balance.service.ts` for event listener pattern
4. Grep for `EventEmitter` or `eventEmitter.emit` to see how events are dispatched

# TASK
Build the Settlement module.

## Server: Settlement Module

**`apps/server/src/modules/settlement/settlement.controller.ts`:**
- `POST /groups/:groupId/settlements` — JWT + GroupMemberGuard — Record a settlement
- `GET /groups/:groupId/settlements` — JWT + GroupMemberGuard — List settlements for group

**`apps/server/src/modules/settlement/settlement.service.ts`:**
- `createSettlement(groupId, dto)`:
  1. Validate paidById and paidToId are both group members
  2. Validate paidById !== paidToId
  3. Validate amountInPaise > 0
  4. Create settlement record
  5. Emit `settlement.created` event (triggers balance cache invalidation)
- `listSettlements(groupId)`: List all settlements with payer/payee names, ordered by createdAt desc

**`apps/server/src/modules/settlement/dto/create-settlement.dto.ts`:**
```typescript
import { IsUUID, IsInt, IsPositive, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSettlementDto {
  @IsUUID()
  paidById: string;

  @IsUUID()
  paidToId: string;

  @IsInt()
  @IsPositive()
  amountInPaise: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

Add balance cache invalidation listener for `settlement.created` event in BalanceService.

Register SettlementModule in AppModule.

# REQUIREMENTS
- Both paidBy and paidTo must be verified group members
- Cannot settle with yourself (paidBy !== paidTo)
- Amount must be positive integer (paise)
- Settlement creation must invalidate balance cache for the group
- Event emitted: `settlement.created` with `{ groupId, settlementId, paidById, paidToId, amountInPaise }`

# VALIDATION
When done, verify:
- [ ] `POST /groups/:groupId/settlements` with valid data returns 201
- [ ] `GET /groups/:groupId/settlements` lists settlements with user names
- [ ] After creating settlement, `GET /groups/:groupId/balances` reflects updated balances
- [ ] Settling with non-member returns 400
- [ ] Settling with yourself returns 400
</prompt>

---

### Phase 9: Dashboard UI
**Goal:** Build the main dashboard with balance summary, group overview, and app shell layout.
**Depends on:** Phase 7, Phase 8

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Server APIs complete: user summary, groups, balances, expenses, settlements
- Client has basic pages from earlier phases but needs the main dashboard and app shell
- Using: Next.js 14+ App Router, Tailwind CSS, shadcn/ui, TanStack React Query, lucide-react icons

# EXPLORATION (do this FIRST)
1. Read `apps/client/app/(dashboard)/layout.tsx` to see if layout exists
2. Read `apps/client/lib/api-client.ts` to understand how API calls are made
3. Read `apps/client/hooks/` to see existing hooks
4. Read `packages/shared/src/utils/money.ts` for formatting functions
5. Check which shadcn/ui components are installed: `ls apps/client/components/ui/`

# TASK
Build the dashboard page and app shell.

## Setup shadcn/ui (if not done)

```bash
cd apps/client
npx shadcn@latest init
```

Install needed components:
```bash
npx shadcn@latest add card button badge separator avatar dropdown-menu sheet
```

## App Shell Layout

**`apps/client/app/(dashboard)/layout.tsx`:**
- Sidebar (desktop) with navigation links: Dashboard, Groups, Activity, Settings
- Mobile bottom nav or hamburger drawer
- Header with: app logo/name "Kharcha", user avatar dropdown (profile, settings, logout)
- Content area

**`apps/client/components/layout/sidebar.tsx`:**
- Links: Dashboard (`/`), Groups (`/groups`), Activity (`/activity`), Settings (`/settings`)
- Active link highlighting
- Icons from lucide-react: Home, Users, Bell, Settings

**`apps/client/components/layout/header.tsx`:**
- Logo + "Kharcha" text
- User avatar + dropdown (profile link, sign out)

**`apps/client/components/layout/mobile-nav.tsx`:**
- Bottom tab bar for mobile, or Sheet-based hamburger menu

## Dashboard Page

**`apps/client/app/(dashboard)/page.tsx`:**
1. Fetch user summary (`GET /users/me/summary`) for aggregate balances
2. Fetch user's groups (`GET /groups`) for group cards
3. Display:
   - **Balance summary cards**: "You are owed ₹X" (green) | "You owe ₹X" (red) | "Net: ₹X"
   - **Your groups**: Grid of group cards with per-group net balance
   - **Empty state**: If no groups, show "Create your first group" CTA

**`apps/client/components/balances/balance-summary.tsx`:**
- Two/three cards: total owed to you, total you owe, net balance
- Color coded: green for positive, red for negative
- Amounts formatted using `formatCurrency()` from `@kharcha/shared`

**`apps/client/components/groups/group-card.tsx`** (enhanced):
- Group name, member count, net balance for current user
- Badge for archived groups
- Click → navigate to `/groups/[groupId]`

**`apps/client/hooks/use-balances.ts`:**
- `useUserSummary()` — fetches `/users/me/summary`
- `useGroupBalances(groupId)` — fetches `/groups/:groupId/balances`
- `useSimplifiedBalances(groupId)` — fetches `/groups/:groupId/balances/simplified`

## TanStack Query Provider

Ensure `apps/client/app/providers.tsx` wraps the app with:
- `QueryClientProvider` (TanStack Query)
- `SessionProvider` (NextAuth)

# REQUIREMENTS
- All money display uses `formatCurrency()` from `@kharcha/shared` (never raw division)
- Responsive: sidebar on desktop (md+), bottom nav on mobile
- Empty states for zero groups, zero balance
- Dashboard data fetches in parallel (React Query)
- Green = money owed to you, Red = money you owe

# CONVENTIONS
- shadcn/ui components in `components/ui/`
- Layout components in `components/layout/`
- Domain components in `components/{domain}/` (e.g., `components/balances/`)
- Hooks in `hooks/`
- All imports from shared: `import { formatCurrency } from '@kharcha/shared'`

# VALIDATION
When done, verify:
- [ ] Dashboard loads at `http://localhost:3000` showing balance summary and group cards
- [ ] Sidebar navigation works (Dashboard, Groups, Settings)
- [ ] Mobile responsive layout works (test at 375px width)
- [ ] Empty state shows when user has no groups
- [ ] Amounts display correctly formatted (e.g., ₹1,500.00 not 150000)
</prompt>

---

### Phase 10: Expense History UI
**Goal:** Build expense history with filters, search, and cursor-based pagination.
**Depends on:** Phase 6, Phase 9

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Dashboard and app shell complete
- Expense API supports: cursor pagination, filter by category/date/paidBy/search
- TanStack Query configured with useInfiniteQuery support

# EXPLORATION (do this FIRST)
1. Read `apps/client/hooks/use-expenses.ts` to see existing hooks
2. Read `apps/client/components/expenses/` to see existing components
3. Read `packages/shared/src/constants/categories.ts` for category list
4. Read `packages/shared/src/types/expense.ts` for ExpenseFilterParams

# TASK
Build the expense history view within the group detail page.

## Components

**`apps/client/components/expenses/expense-filters.tsx`:**
- Date range picker (from/to)
- Category dropdown (from `EXPENSE_CATEGORIES` shared constant)
- "Paid by" dropdown (populated from group members)
- Search text input (debounced, searches description)
- Clear filters button

**`apps/client/components/expenses/expense-list.tsx`** (enhanced):
- Uses `useInfiniteQuery` for cursor-based pagination
- "Load more" button (or intersection observer for infinite scroll)
- Shows expense cards in a list
- Loading skeleton while fetching
- Empty state when no results

**`apps/client/components/expenses/expense-detail.tsx`:**
- Modal or drawer showing full expense detail
- Split breakdown: each participant, their owed amount, split type indicator
- Payer highlighted
- Edit/Delete buttons (if user is creator or admin)

**`apps/client/hooks/use-expenses.ts`** (enhanced):
```typescript
export function useExpenses(groupId: string, filters: ExpenseFilterParams) {
  return useInfiniteQuery({
    queryKey: ['expenses', groupId, filters],
    queryFn: ({ pageParam }) => fetchExpenses(groupId, { ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.meta?.cursor,
    initialPageParam: undefined,
  });
}
```

## Group Detail Page Enhancement

**`apps/client/app/(dashboard)/groups/[groupId]/page.tsx`:**
- Tabs: Expenses | Balances | Settle | Export
- Expenses tab is the default — shows filters + expense list
- "Add expense" floating action button

# REQUIREMENTS
- Debounce search input (300ms)
- Cursor-based pagination (not offset-based)
- Filters persist in URL search params for shareability
- All amounts display using `formatCurrency()` from `@kharcha/shared`
- Expense detail shows split breakdown with per-person amounts

# VALIDATION
When done, verify:
- [ ] Expense list loads with initial page of results
- [ ] "Load more" fetches next page using cursor
- [ ] Category filter narrows results
- [ ] Date range filter works
- [ ] Search finds expenses by description
- [ ] Expense detail modal shows split breakdown
</prompt>

---

### Phase 11: Settlement UI
**Goal:** Build the settlement flow: view balances, settle debts, view history.
**Depends on:** Phase 8, Phase 9

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Balance and Settlement APIs complete
- Dashboard and app shell complete
- Shared types: `BalanceResponse`, `SimplifiedBalanceResponse`, `CreateSettlementRequest`

# EXPLORATION (do this FIRST)
1. Read `apps/client/hooks/use-balances.ts` to see existing balance hooks
2. Read `packages/shared/src/types/balance.ts` and `settlement.ts`
3. Read `apps/client/app/(dashboard)/groups/[groupId]/page.tsx` for current tab structure

# TASK
Build the balances page, settle flow, and settlement history.

## Pages

**`apps/client/app/(dashboard)/groups/[groupId]/balances/page.tsx`:**
- Two views (toggle): "Detailed" (pairwise balances) and "Simplified" (minimum settlements)
- Detailed: list of "User A owes User B ₹X" pairs
- Simplified: list of suggested settlements with "Settle" button per item
- Total group spending summary

**`apps/client/app/(dashboard)/groups/[groupId]/settle/page.tsx`:**
- Pre-filled form from query params (?from=userId&to=userId&amount=paise)
- Or manual entry: select payer, select payee, enter amount
- Note field (optional)
- Submit creates settlement via API
- On success: redirect to balances page, cache invalidated

## Components

**`apps/client/components/balances/simplify-view.tsx`:**
- Shows simplified settlements as cards
- Each card: "UserA → UserB: ₹X" with a "Settle" button
- Visual arrows or flow diagram

**`apps/client/components/settlements/settle-form.tsx`:**
- From (who is paying) — dropdown of group members
- To (who is receiving) — dropdown of group members
- Amount (in rupees, converts to paise on submit)
- Note
- Submit button

**`apps/client/components/settlements/settlement-list.tsx`:**
- List of past settlements
- Each: date, from → to, amount, note
- Sorted by date desc

**`apps/client/hooks/use-settlements.ts`:**
- `useSettlements(groupId)` — fetches settlement list
- `useCreateSettlement(groupId)` — mutation, invalidates balances + settlements cache

# REQUIREMENTS
- After settlement, balance cache must be invalidated (React Query invalidation)
- Settlement form validates: from !== to, amount > 0
- Pre-fill amount from simplified balance suggestion when clicking "Settle" button
- All amounts in paise internally, displayed as formatted currency

# VALIDATION
When done, verify:
- [ ] Balances page shows pairwise balances correctly
- [ ] Simplified view shows fewer transactions
- [ ] Clicking "Settle" on a suggestion pre-fills the form
- [ ] Submitting settlement updates balances immediately
- [ ] Settlement history displays correctly
</prompt>

---

### Phase 12: Export Module
**Goal:** Implement PDF and CSV export generation and client UI.
**Depends on:** Phase 7, Phase 6

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Balance and Expense APIs complete
- Need to generate PDF and CSV exports of group expense data
- Using @react-pdf/renderer for PDF, papaparse for CSV
- Rate limited: 10 exports per minute

# EXPLORATION (do this FIRST)
1. Read `apps/server/src/app.module.ts` to see current modules
2. Read `packages/shared/src/utils/money.ts` for formatting functions
3. Read the tech spec export section for PDF template layout (section 9 of TECH_SPEC.md)

# TASK
Build the Export module.

## Server: Install deps
```bash
pnpm --filter @kharcha/server add @react-pdf/renderer papaparse
pnpm --filter @kharcha/server add -D @types/papaparse
```

## Server: Export Module

**`apps/server/src/modules/export/export.controller.ts`:**
- `GET /groups/:groupId/export` — JWT + GroupMemberGuard — Query params: format (pdf|csv), from, to, includeSettlements
- Rate limited: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- Returns file as stream with `Content-Disposition: attachment; filename=...`

**`apps/server/src/modules/export/export.service.ts`:**
- Queries expenses, splits, settlements for the group within date range
- Computes per-person summary (total paid, total owed, net)
- Computes simplified settlements
- Delegates to PDF or CSV renderer

**`apps/server/src/modules/export/pdf.renderer.ts`:**
Uses @react-pdf/renderer to generate a PDF with:
- Header: "Kharcha" logo/text, export date, group name, date range, member list
- Expense summary: total expenses, transaction count
- Per-person breakdown table: Member | Paid | Owes | Net
- Simplified settlements section
- Itemized expense list: Date | Description | Paid By | Amount | Category

**`apps/server/src/modules/export/csv.renderer.ts`:**
Uses papaparse to generate CSV with columns:
Date, Description, PaidBy, Amount, Currency, Category, SplitType, [then one column per member showing their owed amount]

Register ExportModule in AppModule.

## Client: Export Page

**`apps/client/app/(dashboard)/groups/[groupId]/export/page.tsx`:**
- Format selector: PDF / CSV radio buttons
- Date range picker (from/to)
- Include settlements checkbox
- "Generate Export" button
- Downloads file directly

# REQUIREMENTS
- PDF must be well-formatted with the template from the tech spec
- CSV must be parseable by Excel/Google Sheets
- Rate limit: 10 exports per minute per user
- All amounts in the export display as formatted currency (not paise)
- Date range is optional — defaults to all time

# VALIDATION
When done, verify:
- [ ] `GET /groups/:groupId/export?format=pdf` downloads a valid PDF
- [ ] `GET /groups/:groupId/export?format=csv` downloads a valid CSV
- [ ] PDF contains per-person breakdown and itemized expenses
- [ ] CSV opens correctly in a spreadsheet application
- [ ] 11th request in a minute returns 429 (rate limited)
</prompt>

---

### Phase 13: Notification Module
**Goal:** Implement event-driven notifications, SSE for real-time push, and in-app notification feed.
**Depends on:** Phase 6, Phase 8

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- EventEmitter already configured and used by expense/settlement modules
- Prisma Notification model exists with NotificationType enum
- SSE (Server-Sent Events) chosen for real-time updates (not WebSockets)

# EXPLORATION (do this FIRST)
1. Read `apps/server/prisma/schema.prisma` for Notification model
2. Grep for `eventEmitter.emit` to find all events currently dispatched
3. Read `apps/server/src/app.module.ts` for EventEmitterModule config

# TASK
Build the Notification module with event listeners, SSE endpoint, and client feed.

## Server: Notification Module

**`apps/server/src/modules/notification/events.enum.ts`:**
```typescript
export enum AppEvent {
  EXPENSE_CREATED = 'expense.created',
  EXPENSE_UPDATED = 'expense.updated',
  EXPENSE_DELETED = 'expense.deleted',
  SETTLEMENT_CREATED = 'settlement.created',
  GROUP_MEMBER_JOINED = 'group.member.joined',
}
```

**`apps/server/src/modules/notification/notification.service.ts`:**
- Listens to all AppEvents via `@OnEvent()`
- On `expense.created`: Create notification for each affected user (except payer) — "X added 'description' — you owe ₹Y"
- On `settlement.created`: Notify payee — "X settled ₹Y with you"
- On `group.member.joined`: Notify all existing members — "X joined the group"
- `getNotifications(userId, unreadOnly?)`: List notifications, newest first
- `markAsRead(notificationId, userId)`: Mark single notification as read
- `markAllAsRead(userId)`: Mark all as read
- `getUnreadCount(userId)`: Count of unread notifications

**`apps/server/src/modules/notification/notification.gateway.ts`:**
SSE endpoint:
```typescript
@Controller('events')
export class NotificationGateway {
  private clients = new Map<string, Response[]>();

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  stream(@CurrentUser() user: User, @Res() res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const existing = this.clients.get(user.id) ?? [];
    existing.push(res);
    this.clients.set(user.id, existing);

    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

    res.on('close', () => {
      clearInterval(heartbeat);
      const conns = this.clients.get(user.id) ?? [];
      this.clients.set(user.id, conns.filter(c => c !== res));
    });
  }

  pushToUser(userId: string, data: Record<string, unknown>) {
    const conns = this.clients.get(userId) ?? [];
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    conns.forEach(res => res.write(payload));
  }
}
```

Add notification endpoints:
- `GET /notifications` — JWT — List notifications (paginated)
- `PATCH /notifications/:id/read` — JWT — Mark as read
- `POST /notifications/read-all` — JWT — Mark all as read
- `GET /notifications/unread-count` — JWT — Get unread count

Register NotificationModule in AppModule.

## Client: Notification UI

**`apps/client/hooks/use-sse.ts`:**
```typescript
export function useSSE(url: string, onMessage: (data: any) => void) {
  useEffect(() => {
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSource.onmessage = (event) => onMessage(JSON.parse(event.data));
    return () => eventSource.close();
  }, [url]);
}
```

**`apps/client/components/layout/notification-bell.tsx`:**
- Bell icon with unread count badge
- Click opens dropdown with notification list
- "Mark all as read" button

**`apps/client/components/layout/notification-feed.tsx`:**
- List of notifications with icon per type
- Click notification → navigate to relevant page (group/expense)
- Unread notifications highlighted

# REQUIREMENTS
- Notifications are persisted in DB (not ephemeral)
- SSE connection requires authentication
- Heartbeat every 30 seconds to keep connection alive
- Cleanup SSE connections on client disconnect
- Push notification via SSE AND persist to DB (dual write)

# VALIDATION
When done, verify:
- [ ] Creating an expense generates notifications for affected users
- [ ] SSE endpoint streams events to connected clients
- [ ] Notification bell shows unread count
- [ ] Marking as read updates the count
- [ ] `GET /notifications` returns paginated notification list
</prompt>

---

### Phase 14: Categories, Tags, Recurring Expenses
**Goal:** Add expense categorization and recurring expense scheduling.
**Depends on:** Phase 6

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- Expense module complete — category and tags fields already exist in schema
- Shared constants: `EXPENSE_CATEGORIES` in `packages/shared/src/constants/categories.ts`
- NestJS Schedule module: `@nestjs/schedule` for cron jobs
- Expense schema already has `isRecurring` and `recurrenceRule` fields

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/constants/categories.ts` to see current categories
2. Read `apps/server/prisma/schema.prisma` — check isRecurring and recurrenceRule fields
3. Read `apps/server/src/modules/expense/expense.service.ts` for current expense creation logic
4. Read `apps/client/components/expenses/expense-form.tsx` for current form fields

# TASK
Enhance expenses with categories, tags, and recurring expense support.

## Server

### Install schedule:
```bash
pnpm --filter @kharcha/server add @nestjs/schedule
```

**Category breakdown endpoint:**
Add `GET /groups/:groupId/expenses/breakdown?by=category&from=&to=` to expense controller.
Returns: `{ categories: [{ category: 'food', totalInPaise: 50000, count: 5 }, ...] }`

**Recurring expense service:**
Create `apps/server/src/modules/expense/recurring.service.ts`:
- Cron job runs daily (or configurable interval)
- Queries all expenses where `isRecurring = true` and `recurrenceRule` is set
- Parses RRULE string to determine if a new expense should be created today
- Creates a new expense (copy of the recurring one) with today's date
- Uses same split configuration as the original

For RRULE parsing, use a simple implementation supporting:
- `FREQ=WEEKLY` — every 7 days
- `FREQ=MONTHLY` — same day each month
- Check if last occurrence + interval <= today

Import ScheduleModule in AppModule.

## Client

**Enhanced expense form:**
- Category dropdown using `EXPENSE_CATEGORIES` from shared
- Tags input (comma-separated or chip input)
- Recurring toggle: checkbox + frequency selector (weekly/monthly)

**Category breakdown component:**
- `apps/client/components/expenses/category-breakdown.tsx`
- Bar chart or list showing per-category spending
- Uses data from breakdown endpoint

# REQUIREMENTS
- Category is optional on expenses (existing expenses without categories still work)
- Tags are stored as string array
- Recurring expenses auto-create via cron — no manual intervention needed
- RRULE support: WEEKLY and MONTHLY frequencies minimum
- Category breakdown respects date range filters

# VALIDATION
When done, verify:
- [ ] Expenses can be created with category and tags
- [ ] `GET /groups/:groupId/expenses/breakdown?by=category` returns correct totals
- [ ] Creating a recurring expense with FREQ=WEEKLY creates copies on schedule
- [ ] Expense form shows category selector and recurring toggle
</prompt>

---

### Phase 15: Testing Suite
**Goal:** Comprehensive test coverage: unit, integration, and E2E tests.
**Depends on:** All prior phases

#### Prompt:

<prompt>
# CONTEXT
You are working in the Kharcha Turborepo monorepo.
- All modules are built. The full application is functional.
- Testing tools: Jest (server), Vitest (shared), Playwright (E2E)
- Test database: Use a separate database or Prisma's test utils

# EXPLORATION (do this FIRST)
1. Read `packages/shared/src/utils/split.test.ts` — tests already exist from Phase 0
2. Read `packages/shared/src/utils/money.test.ts` — tests already exist from Phase 0
3. Read `apps/server/package.json` for test script configuration
4. Read `apps/server/test/` directory for any existing test files
5. Read `apps/server/src/modules/` — list all modules to plan test coverage

# TASK
Build the complete testing suite.

## 1. Unit Tests (packages/shared)

These should already exist from Phase 0. Verify and enhance:
- `split.test.ts`: Add edge cases — 1 participant, 50 participants, very large amounts, zero remainder
- `money.test.ts`: Add edge cases — negative amounts, very large numbers

## 2. Unit Tests (apps/server)

**`apps/server/src/modules/balance/simplify.service.spec.ts`:**
```typescript
describe('simplifyDebts', () => {
  it('simplifies 2-person debt', () => {
    // A owes B 100
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 100 },
      { userId: 'B', netInPaise: -100 },
    ]);
    expect(result).toEqual([
      { fromUserId: 'B', toUserId: 'A', amountInPaise: 100 },
    ]);
  });

  it('simplifies 3-person circular debt', () => {
    // A is owed 500, B is owed 200, C owes 700
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 500 },
      { userId: 'B', netInPaise: 200 },
      { userId: 'C', netInPaise: -700 },
    ]);
    expect(result.length).toBeLessThanOrEqual(2);
    // Verify zero-sum: total from amounts = total to amounts
  });

  it('handles 10 people with random amounts', () => {
    // Generate random net balances that sum to zero
    // Verify simplification produces fewer transactions
  });

  it('returns empty array for balanced group', () => {
    const result = simplifyDebts([
      { userId: 'A', netInPaise: 0 },
      { userId: 'B', netInPaise: 0 },
    ]);
    expect(result).toEqual([]);
  });

  it('throws on invariant violation', () => {
    expect(() => simplifyDebts([
      { userId: 'A', netInPaise: 100 },
      { userId: 'B', netInPaise: -50 },
    ])).toThrow('invariant violated');
  });

  it('handles single-member group', () => {
    const result = simplifyDebts([{ userId: 'A', netInPaise: 0 }]);
    expect(result).toEqual([]);
  });
});
```

**`apps/server/src/modules/expense/split-calculator.service.spec.ts`:**
Additional tests beyond what's in shared:
- Integration with Prisma types
- Validation of group membership

## 3. Integration Tests (apps/server/test/)

Setup: Use a test database (create `kharcha_test` database or use Prisma's test setup).

Create a test helper that:
- Resets DB before each test suite
- Provides authenticated request helper (register user, get token, make authenticated requests)
- Provides factory functions for creating test data

**`apps/server/test/auth.e2e-spec.ts`:**
- Register → returns 201 with JWT
- Register duplicate email → returns 409
- Login with valid creds → returns 200 with JWT
- Login with wrong password → returns 401
- Access /auth/me with token → returns user
- Access /auth/me without token → returns 401

**`apps/server/test/groups.e2e-spec.ts`:**
- Create group → creator is ADMIN
- List groups → returns only member groups
- Join via invite code → success
- Join archived group → rejected
- Non-member access → 403
- Update by non-admin → 403

**`apps/server/test/expenses.e2e-spec.ts`:**
- Create EQUAL expense → correct splits
- Create with idempotency key → deduplication works
- List with filters → correct filtering
- Cursor pagination → correct page sequence
- Non-member create → 403

**`apps/server/test/balances.e2e-spec.ts`:**
- Add expenses → check balances are correct
- Simplify → fewer transactions
- Cache invalidation → balances update after new expense

**`apps/server/test/settlements.e2e-spec.ts`:**
- Create settlement → balance updates
- Self-settlement → rejected

**`apps/server/test/export.e2e-spec.ts`:**
- PDF export → valid PDF response (check content-type)
- CSV export → valid CSV response

## 4. E2E Tests (Playwright)

Install Playwright:
```bash
pnpm --filter @kharcha/client add -D @playwright/test
npx playwright install
```

**`apps/client/e2e/auth.spec.ts`:**
- Navigate to /register → fill form → submit → redirected to dashboard
- Navigate to /login → fill form → submit → see dashboard

**`apps/client/e2e/expense-flow.spec.ts`:**
- Login → navigate to group → click "Add expense" → fill form (EQUAL split) → submit → see expense in list → check balance updated

**`apps/client/e2e/settlement-flow.spec.ts`:**
- Login → navigate to group balances → click "Settle" → fill form → submit → balance updated

## Test Configuration

**`apps/server/test/jest-e2e.config.ts`:**
```typescript
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@kharcha/shared$': '<rootDir>/../../packages/shared/src',
  },
};
```

# REQUIREMENTS
- Unit tests must not require a running database or Redis
- Integration tests use a real test database (not mocks)
- E2E tests run against the full stack (client + server + DB)
- Zero-sum invariant must be tested in every balance-related test
- All split types must have at least 2 test cases each (happy path + edge case)

# VALIDATION
When done, verify:
- [ ] `pnpm --filter @kharcha/shared test` — all unit tests pass
- [ ] `pnpm --filter @kharcha/server test` — all unit tests pass
- [ ] `pnpm --filter @kharcha/server test:e2e` — all integration tests pass
- [ ] `pnpm --filter @kharcha/client test:e2e` — all Playwright tests pass
- [ ] Test coverage report shows >70% for shared utils and >50% for server modules
</prompt>

---

## 5. Dependency Graph

```mermaid
graph TD
    P0[Phase 0: Monorepo + Docker + Shared] --> P1[Phase 1: Prisma Schema]
    P0 --> P2[Phase 2: NestJS Bootstrap]
    P1 --> P2
    P2 --> P3[Phase 3: Auth Module]
    P3 --> P4[Phase 4: User Module]
    P3 --> P5[Phase 5: Group Module]
    P4 --> P5
    P5 --> P6[Phase 6: Expense Module]
    P6 --> P7[Phase 7: Balance Module]
    P7 --> P8[Phase 8: Settlement Module]
    P7 --> P9[Phase 9: Dashboard UI]
    P8 --> P9
    P6 --> P10[Phase 10: Expense History UI]
    P9 --> P10
    P8 --> P11[Phase 11: Settlement UI]
    P9 --> P11
    P7 --> P12[Phase 12: Export Module]
    P6 --> P12
    P6 --> P13[Phase 13: Notification Module]
    P8 --> P13
    P6 --> P14[Phase 14: Categories + Recurring]
    P0 --> P15[Phase 15: Testing Suite]
    P14 --> P15
    P13 --> P15
    P12 --> P15
    P11 --> P15
    P10 --> P15

    style P0 fill:#e1f5fe
    style P15 fill:#fff3e0
```

### Text-based Dependency Summary

```
Phase 0  ─── required by all ───────────────────────────────────┐
Phase 1  ─── depends on P0                                       │
Phase 2  ─── depends on P0, P1                                   │
Phase 3  ─── depends on P2                                       │
Phase 4  ─── depends on P3                                       │
Phase 5  ─── depends on P3, P4                                   │
Phase 6  ─── depends on P5                                       │
Phase 7  ─── depends on P6                                       │
Phase 8  ─── depends on P7                                       │
Phase 9  ─── depends on P7, P8                                   │
Phase 10 ─── depends on P6, P9                                   │
Phase 11 ─── depends on P8, P9                                   │
Phase 12 ─── depends on P6, P7                                   │
Phase 13 ─── depends on P6, P8                                   │
Phase 14 ─── depends on P6                                       │
Phase 15 ─── depends on all                                      │
                                                                  │
Parallelizable pairs (with 2 devs):                              │
  P10 + P11 (both depend on P9, independent of each other)       │
  P12 + P13 (both depend on P6/P7/P8, independent of each other)│
  P12 + P14 (independent)                                        │
```

---

## 6. Risk Callouts

### Contradictions Between PRD and Tech Spec

1. **Amount storage type mismatch:** The PRD data model (section 4.3) describes `amount (decimal, 2dp)` and `owed_amount (decimal, 2dp)`, but the Tech Spec (ADR-004, section 4.3) explicitly mandates integer storage (paise/cents). **Resolution: The tech spec is correct. We use integers throughout.** The PRD's simplified model is aspirational; the tech spec is authoritative.

2. **App naming:** The PRD uses "Next.js Web" and the tech spec uses `apps/web` and `apps/api`. **Resolution: We override both with `apps/client` and `apps/server` per the key decisions table.**

3. **Auth strategy ambiguity:** The PRD lists "Keycloak or NextAuth.js v5" and the tech spec's ADR-002 recommends NextAuth for MVP. **Resolution: NextAuth v5 per key decisions. No Keycloak.**

### Gaps (Unspecified Behavior)

1. **User removal from group with unsettled expenses:** Neither doc specifies what happens. **Recommendation:** Prevent removal if user has unsettled balances in the group. Show error: "User has ₹X unsettled. Settle first or waive debts."

2. **Expense editing after settlements:** If an expense is edited after partial settlements have occurred, how are balances recalculated? **Recommendation:** Disallow editing expenses that have associated settlements. Or: recalculate all balances from scratch on edit (costlier but correct).

3. **Non-user participant (Participant model) lifecycle:** The schema has a `Participant` model for the cold-start problem (R5), but neither doc fully specifies: (a) how participants are created in the UI, (b) how linking to a real user works when they sign up, (c) how splits referencing a Participant migrate to a User. **Recommendation:** Defer Participant model to post-MVP. For MVP, require all expense participants to be registered users who are group members.

4. **Group deletion:** Neither doc mentions deleting groups (only archiving). **Recommendation:** Stick with archive-only. No hard delete for data integrity.

5. **Concurrent expense creation:** What if two users create expenses simultaneously that affect the same balance? **Resolution:** The Redis cache invalidation + DB as source of truth handles this. No explicit locking needed for MVP scale.

6. **Currency mismatch in groups:** Can a group have expenses in multiple currencies? The schema allows it (each expense has its own currency field) but balance computation assumes a single currency. **Recommendation:** For MVP, enforce single currency per group. Add a `defaultCurrency` field to Group model.

### Technical Decisions to Challenge

1. **@react-pdf/renderer for complex tables:** The tech spec chose this over Puppeteer (ADR-006), but @react-pdf/renderer has limited table/layout support compared to HTML-to-PDF. For the detailed invoice template shown in section 9.2, Puppeteer would produce better results. **Counter-argument:** @react-pdf is lighter weight and sufficient for MVP. **Recommendation:** Start with @react-pdf, switch to Puppeteer if layout issues arise.

2. **No soft-delete on expenses:** The security checklist (14.1) mentions "expenses are never hard-deleted" but the schema doesn't have an `isDeleted` or `deletedAt` field. **Recommendation:** Add `deletedAt DateTime? @map("deleted_at")` to the Expense model and filter deleted expenses in all queries.

3. **SSE scalability with multiple server instances:** If NestJS is eventually scaled horizontally, in-memory SSE connections (`Map<userId, Response[]>`) won't work across instances. **Recommendation:** Acceptable for MVP (single instance). For scale, use Redis pub/sub to broadcast events across instances.

4. **Missing refresh token strategy:** The tech spec mentions JWT expiry (15min access, 7 days refresh) in security (14.1) but the auth implementation only shows a single JWT. **Recommendation:** For MVP, use a single JWT with 7-day expiry (as in the NextAuth config). Add refresh tokens in v2.

### Scope Items to Defer Beyond Phase 15

1. **Multi-currency support (F12)** — Requires exchange rate API integration, currency conversion layer
2. **Receipt image attachment (F13)** — Requires object storage (GCS/S3), upload handling, optional OCR
3. **Comments & dispute resolution (F14)** — New data model, real-time threads
4. **Analytics dashboard (F15)** — Charts, aggregation queries, date range analysis
5. **Non-user participants (Participant model)** — Complex migration when user signs up
6. **OpenTelemetry observability** — Useful but non-functional; add before production launch
7. **Account lockout on failed login attempts** — Security hardening for production
8. **Email notifications and digests** — Requires email service integration (SendGrid, etc.)
9. **PWA support** — Service worker, offline capability
10. **Accessibility audit (WCAG 2.1 AA)** — Important but separate effort post-MVP
