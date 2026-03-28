
# Technical Specification
# Kharcha (खर्चा) — Expense Splitting & Tracking Platform

**Spec Version:** 1.0  
**Author:** Alex Rivera, Lead Engineer  
**Date:** March 28, 2026  
**PRD Reference:** `docs/PRD.md`  
**Status:** Draft — Ready for Engineering Review

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Repository & Folder Structure](#2-repository--folder-structure)
3. [Tech Stack & Dependencies](#3-tech-stack--dependencies)
4. [Database Design](#4-database-design)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Specification](#6-api-specification)
7. [Core Business Logic](#7-core-business-logic)
8. [Real-Time & Notifications](#8-real-time--notifications)
9. [Export Engine (PDF/CSV)](#9-export-engine-pdfcsv)
10. [Observability & Monitoring](#10-observability--monitoring)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Testing Strategy](#12-testing-strategy)
13. [Environment Configuration](#13-environment-configuration)
14. [Security Hardening](#14-security-hardening)
15. [Migration & Seed Strategy](#15-migration--seed-strategy)

---

## 1. Architecture Overview

### 1.1 System Architecture Pattern

**Modular Monolith** (NestJS) with a **Next.js BFF** layer.

Rationale: A microservices split is premature at this stage. A modular monolith
gives us domain isolation (each module has its own service/controller/repository)
while keeping deployment and debugging simple. We can extract modules into
standalone services later if load demands it.

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  Next.js Web App (App Router, RSC)     PWA (future)          │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   NEXT.JS BFF LAYER                          │
│  /app/api/* Route Handlers                                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ Session    │ │ Request    │ │ Response   │               │
│  │ Validation │ │ Aggregation│ │ Shaping    │               │
│  └────────────┘ └────────────┘ └────────────┘               │
│  Cookie-based session (httpOnly, secure, SameSite=Lax)       │
└────────────────────────┬─────────────────────────────────────┘
                         │ Internal HTTP (JWT Bearer)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   NESTJS API SERVER                           │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Auth    │ │  Group   │ │ Expense  │ │ Balance  │       │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Settlement│ │  Export  │ │ Notif.   │ │  User    │       │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  Shared: Guards, Interceptors, Pipes, Filters, OTel SDK      │
└──────┬──────────────┬──────────────┬─────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ PostgreSQL │ │   Redis    │ │  GCS / S3  │
│  (Prisma)  │ │  (ioredis) │ │ (receipts, │
│            │ │            │ │  exports)  │
└────────────┘ └────────────┘ └────────────┘
```

### 1.2 Communication Patterns

| From → To                | Protocol        | Auth              |
|--------------------------|-----------------|-------------------|
| Browser → Next.js BFF    | HTTPS           | Session cookie    |
| Next.js BFF → NestJS API | Internal HTTP   | JWT Bearer token  |
| NestJS → PostgreSQL      | TCP (Prisma)    | Connection string  |
| NestJS → Redis           | TCP (ioredis)   | Password auth     |
| NestJS → GCS/S3          | HTTPS           | Service account   |

### 1.3 Key Architecture Decisions (ADRs)

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| ADR-001: Backend pattern | Modular monolith | Microservices, serverless functions | Faster iteration, single deploy, easy debugging. Extract later. |
| ADR-002: Auth strategy | NextAuth v5 (MVP) | Keycloak, Clerk, Supabase Auth | Fastest time-to-auth. Migrate to Keycloak in v2 if RBAC/enterprise needed. |
| ADR-003: ORM | Prisma | TypeORM, Drizzle, Knex | Type safety, migration tooling, broad adoption. Drizzle if perf bottleneck. |
| ADR-004: Amount storage | Integer (paise/cents) | Decimal, float | Eliminates floating point drift. All math is integer. Display layer converts. |
| ADR-005: Balance computation | Materialized cache (Redis) + on-demand recalc | Event sourcing, DB triggers | Simple, fast reads. Cache invalidated on writes. Full recalc as fallback. |
| ADR-006: PDF generation | @react-pdf/renderer | Puppeteer, wkhtmltopdf | Lighter weight, no headless browser overhead, runs in Node.js directly. |
| ADR-007: Real-time updates | SSE (Server-Sent Events) | WebSockets, polling | Unidirectional (server→client) is sufficient. Simpler infra than WS. |
| ADR-008: Monorepo tool | Turborepo | Nx, pnpm workspaces only | Fast caching, simple config, good Next.js integration. |

---

## 2. Repository & Folder Structure

### 2.1 Monorepo Layout (Turborepo + pnpm workspaces)

```
kharcha/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + Test + Type-check
│       ├── deploy-api.yml            # NestJS → Cloud Run
│       └── deploy-web.yml            # Next.js → Vercel
├── .husky/
│   ├── pre-commit                    # lint-staged
│   └── commit-msg                    # commitlint
├── apps/
│   ├── web/                          # Next.js 14+ App Router
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx          # Home dashboard
│   │   │   │   ├── groups/
│   │   │   │   │   ├── page.tsx      # Group list
│   │   │   │   │   ├── [groupId]/
│   │   │   │   │   │   ├── page.tsx  # Group detail + expenses
│   │   │   │   │   │   ├── balances/page.tsx
│   │   │   │   │   │   ├── settle/page.tsx
│   │   │   │   │   │   └── export/page.tsx
│   │   │   │   │   └── new/page.tsx
│   │   │   │   ├── activity/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── api/                  # BFF Route Handlers
│   │   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   │   ├── groups/route.ts
│   │   │   │   ├── groups/[groupId]/expenses/route.ts
│   │   │   │   ├── groups/[groupId]/balances/route.ts
│   │   │   │   ├── groups/[groupId]/settlements/route.ts
│   │   │   │   └── groups/[groupId]/export/route.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── expenses/
│   │   │   │   ├── expense-form.tsx
│   │   │   │   ├── expense-list.tsx
│   │   │   │   ├── expense-card.tsx
│   │   │   │   └── split-selector.tsx
│   │   │   ├── groups/
│   │   │   │   ├── group-card.tsx
│   │   │   │   ├── group-form.tsx
│   │   │   │   ├── invite-dialog.tsx
│   │   │   │   └── member-list.tsx
│   │   │   ├── balances/
│   │   │   │   ├── balance-summary.tsx
│   │   │   │   ├── balance-pair.tsx
│   │   │   │   └── simplify-view.tsx
│   │   │   ├── settlements/
│   │   │   │   ├── settle-form.tsx
│   │   │   │   └── settlement-list.tsx
│   │   │   └── layout/
│   │   │       ├── sidebar.tsx
│   │   │       ├── header.tsx
│   │   │       └── mobile-nav.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Typed fetch wrapper for BFF→NestJS
│   │   │   ├── auth.ts               # NextAuth config
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   ├── hooks/
│   │   │   ├── use-groups.ts
│   │   │   ├── use-expenses.ts
│   │   │   ├── use-balances.ts
│   │   │   └── use-sse.ts            # SSE hook for real-time
│   │   ├── types/
│   │   │   └── index.ts              # Re-exports from @kharcha/shared
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # NestJS API Server
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   └── group-member.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   ├── logging.interceptor.ts
│       │   │   │   └── transform.interceptor.ts
│       │   │   ├── filters/
│       │   │   │   └── http-exception.filter.ts
│       │   │   ├── pipes/
│       │   │   │   └── validation.pipe.ts
│       │   │   ├── decorators/
│       │   │   │   ├── current-user.decorator.ts
│       │   │   │   └── group-role.decorator.ts
│       │   │   └── dto/
│       │   │       └── pagination.dto.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   └── jwt.strategy.ts
│       │   │   │   └── dto/
│       │   │   │       ├── register.dto.ts
│       │   │   │       └── login.dto.ts
│       │   │   ├── user/
│       │   │   │   ├── user.module.ts
│       │   │   │   ├── user.controller.ts
│       │   │   │   ├── user.service.ts
│       │   │   │   └── dto/
│       │   │   │       └── update-user.dto.ts
│       │   │   ├── group/
│       │   │   │   ├── group.module.ts
│       │   │   │   ├── group.controller.ts
│       │   │   │   ├── group.service.ts
│       │   │   │   └── dto/
│       │   │   │       ├── create-group.dto.ts
│       │   │   │       ├── update-group.dto.ts
│       │   │   │       └── invite.dto.ts
│       │   │   ├── expense/
│       │   │   │   ├── expense.module.ts
│       │   │   │   ├── expense.controller.ts
│       │   │   │   ├── expense.service.ts
│       │   │   │   ├── split-calculator.service.ts
│       │   │   │   └── dto/
│       │   │   │       ├── create-expense.dto.ts
│       │   │   │       └── expense-filter.dto.ts
│       │   │   ├── balance/
│       │   │   │   ├── balance.module.ts
│       │   │   │   ├── balance.controller.ts
│       │   │   │   ├── balance.service.ts
│       │   │   │   └── simplify.service.ts  # Debt simplification algo
│       │   │   ├── settlement/
│       │   │   │   ├── settlement.module.ts
│       │   │   │   ├── settlement.controller.ts
│       │   │   │   ├── settlement.service.ts
│       │   │   │   └── dto/
│       │   │   │       └── create-settlement.dto.ts
│       │   │   ├── export/
│       │   │   │   ├── export.module.ts
│       │   │   │   ├── export.controller.ts
│       │   │   │   ├── export.service.ts
│       │   │   │   ├── pdf.renderer.ts
│       │   │   │   └── csv.renderer.ts
│       │   │   └── notification/
│       │   │       ├── notification.module.ts
│       │   │       ├── notification.service.ts
│       │   │       ├── notification.gateway.ts  # SSE endpoint
│       │   │       └── events.enum.ts
│       │   ├── prisma/
│       │   │   ├── prisma.module.ts
│       │   │   └── prisma.service.ts
│       │   ├── redis/
│       │   │   ├── redis.module.ts
│       │   │   └── redis.service.ts
│       │   └── telemetry/
│       │       ├── tracing.ts            # OTel SDK bootstrap
│       │       └── metrics.ts
│       ├── test/
│       │   ├── jest-e2e.config.ts
│       │   ├── app.e2e-spec.ts
│       │   └── fixtures/
│       │       ├── users.fixture.ts
│       │       ├── groups.fixture.ts
│       │       └── expenses.fixture.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared types, constants, utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── group.ts
│   │   │   │   ├── expense.ts
│   │   │   │   ├── balance.ts
│   │   │   │   ├── settlement.ts
│   │   │   │   └── api-response.ts
│   │   │   ├── constants/
│   │   │   │   ├── currencies.ts
│   │   │   │   ├── categories.ts
│   │   │   │   └── split-types.ts
│   │   │   ├── utils/
│   │   │   │   ├── money.ts          # Integer math helpers (toPaise, toDisplay)
│   │   │   │   ├── split.ts          # Split calculation pure functions
│   │   │   │   └── validation.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── eslint-config/                # Shared ESLint config
│   └── tsconfig/                     # Shared TS configs
│
├── docker/
│   ├── docker-compose.yml            # Local dev: Postgres + Redis
│   ├── docker-compose.test.yml       # CI: ephemeral test DBs
│   └── nginx/                        # Reverse proxy (optional)
│
├── docs/
│   ├── PRD.md
│   ├── TECH-SPEC.md                  # This document
│   ├── API.md                        # Auto-generated from Swagger
│   └── ADR/
│       ├── 001-modular-monolith.md
│       ├── 002-nextauth-mvp.md
│       ├── 003-prisma-orm.md
│       ├── 004-integer-amounts.md
│       └── ...
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Tech Stack & Dependencies

### 3.1 Root Dependencies (Monorepo)

```jsonc
// package.json (root)
{
  "devDependencies": {
    "turbo": "^2.x",
    "prettier": "^3.x",
    "eslint": "^9.x",
    "husky": "^9.x",
    "lint-staged": "^15.x",
    "@commitlint/cli": "^19.x",
    "@commitlint/config-conventional": "^19.x"
  }
}
```

### 3.2 Web App (`apps/web`)

```jsonc
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "next-auth": "^5.x",               // Auth (beta → stable)
    "@tanstack/react-query": "^5.x",   // Server state management
    "tailwindcss": "^3.4",
    "class-variance-authority": "^0.7",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "lucide-react": "^0.400",          // Icons
    "zod": "^3.23",                    // Client-side validation
    "date-fns": "^3.x",               // Date formatting
    "sonner": "^1.x",                 // Toast notifications
    "@kharcha/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "@types/react": "^18.3",
    "@testing-library/react": "^16.x",
    "vitest": "^2.x",
    "@playwright/test": "^1.45"
  }
}
```

### 3.3 API Server (`apps/api`)

```jsonc
{
  "dependencies": {
    "@nestjs/core": "^10.x",
    "@nestjs/common": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/passport": "^10.x",
    "@nestjs/jwt": "^10.x",
    "@nestjs/swagger": "^7.x",
    "@nestjs/throttler": "^5.x",       // Rate limiting
    "@nestjs/schedule": "^4.x",        // Cron (recurring expenses)
    "@nestjs/event-emitter": "^2.x",   // Internal events
    "@prisma/client": "^5.x",
    "prisma": "^5.x",
    "ioredis": "^5.x",
    "passport": "^0.7",
    "passport-jwt": "^4.x",
    "bcrypt": "^5.x",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "zod": "^3.23",
    "@react-pdf/renderer": "^3.x",     // PDF generation
    "papaparse": "^5.x",              // CSV generation
    "nanoid": "^5.x",                 // Invite codes
    "helmet": "^7.x",
    "@opentelemetry/api": "^1.9",
    "@opentelemetry/sdk-node": "^0.52",
    "@opentelemetry/auto-instrumentations-node": "^0.49",
    "@opentelemetry/exporter-trace-otlp-http": "^0.52",
    "@kharcha/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "@nestjs/testing": "^10.x",
    "jest": "^29.x",
    "@types/jest": "^29.x",
    "supertest": "^7.x",
    "@types/supertest": "^6.x",
    "@types/bcrypt": "^5.x"
  }
}
```

---

## 4. Database Design

### 4.1 Prisma Schema

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

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

  // Relations
  groupMemberships GroupMember[]
  expensesPaid     Expense[]      @relation("PaidBy")
  expenseSplits    ExpenseSplit[]
  settlementsPaid  Settlement[]   @relation("SettlementPaidBy")
  settlementsReceived Settlement[] @relation("SettlementPaidTo")
  notifications    Notification[]
  createdGroups    Group[]        @relation("GroupCreator")

  // OAuth accounts (NextAuth)
  accounts         Account[]

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

// ─────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────

model Group {
  id          String    @id @default(uuid()) @db.Uuid
  name        String    @db.VarChar(100)
  description String?   @db.VarChar(500)
  createdById String    @map("created_by") @db.Uuid
  inviteCode  String    @unique @map("invite_code") @db.VarChar(12)
  isArchived  Boolean   @default(false) @map("is_archived")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
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

// ─────────────────────────────────────────────
// NON-USER PARTICIPANTS (cold start solution)
// ─────────────────────────────────────────────

model Participant {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(100)
  email       String?  @db.VarChar(255)
  phone       String?  @db.VarChar(20)
  linkedUserId String? @map("linked_user_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  // When a non-user signs up, we set linkedUserId and migrate their splits.
  expenseSplits ExpenseSplit[]

  @@index([email])
  @@index([linkedUserId])
  @@map("participants")
}

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────

enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARES
}

model Expense {
  id              String    @id @default(uuid()) @db.Uuid
  groupId         String    @map("group_id") @db.Uuid
  paidById        String    @map("paid_by") @db.Uuid
  amountInPaise   Int       @map("amount_in_paise")    // ← INTEGER, not decimal
  currency        String    @default("INR") @db.VarChar(3)
  description     String    @db.VarChar(500)
  category        String?   @db.VarChar(50)
  tags            String[]  @default([])
  splitType       SplitType @map("split_type")
  date            DateTime  @db.Date
  receiptUrl      String?   @map("receipt_url") @db.VarChar(500)
  idempotencyKey  String?   @unique @map("idempotency_key") @db.VarChar(64)
  isRecurring     Boolean   @default(false) @map("is_recurring")
  recurrenceRule  String?   @map("recurrence_rule") @db.VarChar(255)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  group  Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy User           @relation("PaidBy", fields: [paidById], references: [id])
  splits ExpenseSplit[]

  @@index([groupId, date])
  @@index([groupId, category])
  @@index([paidById])
  @@map("expenses")
}

model ExpenseSplit {
  id             String  @id @default(uuid()) @db.Uuid
  expenseId      String  @map("expense_id") @db.Uuid
  userId         String? @map("user_id") @db.Uuid
  participantId  String? @map("participant_id") @db.Uuid
  owedAmountInPaise Int  @map("owed_amount_in_paise")  // ← INTEGER
  shareValue     Float?  @map("share_value")           // For PERCENTAGE/SHARES display

  expense     Expense      @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user        User?        @relation(fields: [userId], references: [id])
  participant Participant? @relation(fields: [participantId], references: [id])

  @@index([expenseId])
  @@index([userId])
  @@index([participantId])
  @@map("expense_splits")
}

// ─────────────────────────────────────────────
// SETTLEMENTS
// ─────────────────────────────────────────────

model Settlement {
  id              String   @id @default(uuid()) @db.Uuid
  groupId         String   @map("group_id") @db.Uuid
  paidById        String   @map("paid_by") @db.Uuid
  paidToId        String   @map("paid_to") @db.Uuid
  amountInPaise   Int      @map("amount_in_paise")
  note            String?  @db.VarChar(500)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  group  Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy User  @relation("SettlementPaidBy", fields: [paidById], references: [id])
  paidTo User  @relation("SettlementPaidTo", fields: [paidToId], references: [id])

  @@index([groupId])
  @@index([paidById])
  @@index([paidToId])
  @@map("settlements")
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

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

### 4.2 Key Indexes & Query Patterns

| Query Pattern | Index Strategy |
|---------------|---------------|
| List expenses by group + date range | `expenses(group_id, date)` composite |
| Filter expenses by category in group | `expenses(group_id, category)` composite |
| Calculate balances for a group | Aggregate on `expense_splits` by `group_id` via expense join |
| User's splits across all groups | `expense_splits(user_id)` |
| Lookup group by invite code | `groups(invite_code)` unique |
| Unread notifications for user | `notifications(user_id, is_read)` partial index |

### 4.3 Amount Storage Convention

**All monetary values stored as integers in the smallest currency unit.**

```typescript
// packages/shared/src/utils/money.ts

export const toPaise = (amount: number): number => Math.round(amount * 100);
export const toDisplay = (paise: number): number => paise / 100;
export const formatINR = (paise: number): string =>
  `₹${(paise / 100).toFixed(2)}`;
```

Why: ₹100.10 split 3 ways = 33.3666... as a float. As paise: 10010 / 3 = 3336
remainder 2. Assign 3337 to first two, 3336 to last. Zero-sum guaranteed.

---

## 5. Authentication & Authorization

### 5.1 Auth Flow (NextAuth v5 + JWT)

```
┌────────┐        ┌───────────┐        ┌──────────┐
│ Browser │───────▶│ Next.js   │───────▶│ NestJS   │
│         │  (1)   │ BFF       │  (4)   │ API      │
│         │◀───────│           │◀───────│          │
│         │  (6)   │           │  (5)   │          │
└────────┘        └───────────┘        └──────────┘

(1) User submits login form (email/password or Google OAuth)
(2) NextAuth handles credential validation / OAuth flow
(3) NextAuth creates session + issues JWT
(4) BFF Route Handlers attach JWT as Bearer token to NestJS requests
(5) NestJS JwtAuthGuard validates token, extracts user context
(6) Response flows back through BFF to browser
```

### 5.2 NextAuth Configuration

```typescript
// apps/web/lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        // Call NestJS /auth/login, return user or null
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.userId = user.id; }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
});
```

### 5.3 NestJS JWT Guard

```typescript
// apps/api/src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// apps/api/src/modules/auth/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return user;
  }
}
```

### 5.4 Group Membership Guard

```typescript
// apps/api/src/common/guards/group-member.guard.ts
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const groupId = request.params.groupId;

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership) throw new ForbiddenException('Not a group member');

    request.groupRole = membership.role; // attach for @GroupRole() decorator
    return true;
  }
}
```

---

## 6. API Specification

### 6.1 Response Envelope

All API responses follow a consistent envelope:

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {                    // Present on paginated responses
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "hasMore": true,
    "cursor": "abc123"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "Group with ID xyz does not exist.",
    "details": {}              // Optional validation errors
  }
}
```

### 6.2 Endpoint Catalogue

#### Auth Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register with email/password |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user profile |

#### User Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/users/me` | JWT | Update profile (name, avatar, currency) |
| GET | `/users/me/summary` | JWT | Aggregate balances across all groups |

#### Group Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups` | JWT | Create group (creator = ADMIN) |
| GET | `/groups` | JWT | List user's groups |
| GET | `/groups/:groupId` | JWT + Member | Group details with member list |
| PATCH | `/groups/:groupId` | JWT + Admin | Update name/description |
| POST | `/groups/:groupId/archive` | JWT + Admin | Soft-archive group |
| GET | `/groups/:groupId/invite` | JWT + Member | Get/regenerate invite link |
| POST | `/groups/join/:inviteCode` | JWT | Join group via invite code |

#### Expense Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups/:groupId/expenses` | JWT + Member | Create expense with splits |
| GET | `/groups/:groupId/expenses` | JWT + Member | List expenses (filterable) |
| GET | `/groups/:groupId/expenses/:expenseId` | JWT + Member | Expense detail with splits |
| PATCH | `/groups/:groupId/expenses/:expenseId` | JWT + Member* | Update expense (* = creator or admin) |
| DELETE | `/groups/:groupId/expenses/:expenseId` | JWT + Member* | Soft-delete expense |

**Query Parameters for GET expenses:**
```
?category=food
&from=2026-01-01
&to=2026-03-31
&paidBy=<userId>
&splitWith=<userId>
&search=uber
&cursor=<lastId>
&pageSize=20
&sort=date:desc
```

#### Balance Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/groups/:groupId/balances` | JWT + Member | Raw pairwise balances |
| GET | `/groups/:groupId/balances/simplified` | JWT + Member | Minimized settlement plan |

#### Settlement Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/groups/:groupId/settlements` | JWT + Member | Record a settlement payment |
| GET | `/groups/:groupId/settlements` | JWT + Member | Settlement history |

#### Export Module

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/groups/:groupId/export` | JWT + Member | Generate PDF or CSV |

**Query Parameters:**
```
?format=pdf|csv
&from=2026-01-01
&to=2026-03-31
&includeSettlements=true
```

### 6.3 Key DTOs

```typescript
// CreateExpenseDto
{
  "amountInPaise": 150000,           // ₹1500.00
  "currency": "INR",
  "description": "Dinner at Olive Bar",
  "category": "food",
  "tags": ["dining", "goa-trip"],
  "splitType": "EQUAL",              // EQUAL | EXACT | PERCENTAGE | SHARES
  "date": "2026-03-28",
  "paidById": "uuid-of-payer",
  "splits": [                        // Required for EXACT, PERCENTAGE, SHARES
    { "userId": "uuid-1", "value": 50 },
    { "userId": "uuid-2", "value": 30 },
    { "userId": "uuid-3", "value": 20 }
  ],
  "idempotencyKey": "client-generated-uuid"
}

// BalanceResponse
{
  "groupId": "uuid",
  "balances": [
    { "from": "uuid-1", "to": "uuid-2", "amountInPaise": 75000 },
    { "from": "uuid-3", "to": "uuid-1", "amountInPaise": 25000 }
  ],
  "updatedAt": "2026-03-28T10:30:00Z"
}

// SimplifiedBalanceResponse
{
  "groupId": "uuid",
  "settlements": [
    {
      "from": { "id": "uuid-1", "name": "Priya" },
      "to": { "id": "uuid-2", "name": "Marcus" },
      "amountInPaise": 50000
    }
  ],
  "originalTransactionCount": 5,
  "simplifiedTransactionCount": 2
}
```

---

## 7. Core Business Logic

### 7.1 Split Calculation Engine

```typescript
// packages/shared/src/utils/split.ts

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
  participants: { userId: string }[]
): SplitResult {
  const n = participants.length;
  const base = Math.floor(totalInPaise / n);
  const remainder = totalInPaise - base * n;

  return participants.map((p, i) => ({
    userId: p.userId,
    owedInPaise: base + (i < remainder ? 1 : 0),
    // First `remainder` people pay 1 extra paise
  }));
}

function splitExact(
  totalInPaise: number,
  participants: { userId: string; value?: number }[]
): SplitResult {
  const sum = participants.reduce((s, p) => s + (p.value ?? 0), 0);
  if (sum !== totalInPaise) {
    throw new Error(`Exact split sum (${sum}) != total (${totalInPaise})`);
  }
  return participants.map((p) => ({
    userId: p.userId,
    owedInPaise: p.value!,
  }));
}

function splitPercentage(
  totalInPaise: number,
  participants: { userId: string; value?: number }[]
): SplitResult {
  const totalPercent = participants.reduce((s, p) => s + (p.value ?? 0), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100, got ${totalPercent}`);
  }

  let allocated = 0;
  const results = participants.map((p, i) => {
    const raw = Math.round((totalInPaise * (p.value ?? 0)) / 100);
    allocated += raw;
    return { userId: p.userId, owedInPaise: raw };
  });

  // Fix rounding: adjust last participant
  const diff = totalInPaise - allocated;
  results[results.length - 1].owedInPaise += diff;

  return results;
}

function splitByShares(
  totalInPaise: number,
  participants: { userId: string; value?: number }[]
): SplitResult {
  const totalShares = participants.reduce((s, p) => s + (p.value ?? 1), 0);

  let allocated = 0;
  const results = participants.map((p) => {
    const raw = Math.round((totalInPaise * (p.value ?? 1)) / totalShares);
    allocated += raw;
    return { userId: p.userId, owedInPaise: raw };
  });

  const diff = totalInPaise - allocated;
  results[results.length - 1].owedInPaise += diff;

  return results;
}
```

### 7.2 Debt Simplification Algorithm

```typescript
// apps/api/src/modules/balance/simplify.service.ts

/**
 * Minimum Cash Flow Algorithm
 *
 * Given net balances for each user in a group, compute the minimum
 * number of transactions to settle all debts.
 *
 * Approach:
 * 1. Compute net balance per user (total paid - total owed)
 * 2. Separate into creditors (+) and debtors (-)
 * 3. Greedily match largest creditor with largest debtor
 * 4. Repeat until all balances are zero
 *
 * Time: O(n²) — acceptable for groups up to 50 members
 */

export interface NetBalance {
  userId: string;
  netInPaise: number; // positive = owed money, negative = owes money
}

export interface SimplifiedSettlement {
  fromUserId: string;
  toUserId: string;
  amountInPaise: number;
}

export function simplifyDebts(
  netBalances: NetBalance[]
): SimplifiedSettlement[] {
  // Validate zero-sum invariant
  const sum = netBalances.reduce((s, b) => s + b.netInPaise, 0);
  if (sum !== 0) {
    throw new Error(`Balance invariant violated: sum = ${sum}, expected 0`);
  }

  const creditors: NetBalance[] = []; // positive net (owed money)
  const debtors: NetBalance[] = [];   // negative net (owes money)

  for (const b of netBalances) {
    if (b.netInPaise > 0) creditors.push({ ...b });
    else if (b.netInPaise < 0) debtors.push({ ...b, netInPaise: -b.netInPaise });
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.netInPaise - a.netInPaise);
  debtors.sort((a, b) => b.netInPaise - a.netInPaise);

  const settlements: SimplifiedSettlement[] = [];
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

### 7.3 Balance Computation

```typescript
// apps/api/src/modules/balance/balance.service.ts

@Injectable()
export class BalanceService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private simplifyService: SimplifyService,
  ) {}

  async getGroupBalances(groupId: string): Promise {
    // Try cache first
    const cacheKey = `balances:${groupId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Compute from DB
    const balances = await this.computeFromDB(groupId);

    // Cache for 5 minutes (invalidated on writes anyway)
    await this.redis.set(cacheKey, JSON.stringify(balances), 'EX', 300);

    return balances;
  }

  async invalidateCache(groupId: string): Promise {
    await this.redis.del(`balances:${groupId}`);
    await this.redis.del(`balances:simplified:${groupId}`);
  }

  private async computeFromDB(groupId: string) {
    // Step 1: Sum all expense splits per user in this group
    const splits = await this.prisma.$queryRaw`
      SELECT
        es.user_id,
        SUM(es.owed_amount_in_paise) as total_owed
      FROM expense_splits es
      JOIN expenses e ON e.id = es.expense_id
      WHERE e.group_id = ${groupId}::uuid
      GROUP BY es.user_id
    `;

    // Step 2: Sum all amounts paid per user in this group
    const payments = await this.prisma.$queryRaw`
      SELECT
        paid_by as user_id,
        SUM(amount_in_paise) as total_paid
      FROM expenses
      WHERE group_id = ${groupId}::uuid
      GROUP BY paid_by
    `;

    // Step 3: Sum all settlements
    const settlements = await this.prisma.$queryRaw`
      SELECT
        paid_by as user_id,
        paid_to as to_user_id,
        SUM(amount_in_paise) as total_settled
      FROM settlements
      WHERE group_id = ${groupId}::uuid
      GROUP BY paid_by, paid_to
    `;

    // Step 4: Compute net balance per user
    // net = totalPaid - totalOwed + settlementsReceived - settlementsPaid
    // ... (combine the three queries into net balances)
  }
}
```

---

## 8. Real-Time & Notifications

### 8.1 Event System (Internal)

```typescript
// NestJS EventEmitter for decoupled module communication

// Event types
export enum AppEvent {
  EXPENSE_CREATED = 'expense.created',
  EXPENSE_UPDATED = 'expense.updated',
  EXPENSE_DELETED = 'expense.deleted',
  SETTLEMENT_CREATED = 'settlement.created',
  GROUP_MEMBER_JOINED = 'group.member.joined',
}

// In ExpenseService:
this.eventEmitter.emit(AppEvent.EXPENSE_CREATED, {
  groupId,
  expenseId,
  paidById,
  affectedUserIds,
});

// In BalanceService (listener):
@OnEvent(AppEvent.EXPENSE_CREATED)
async handleExpenseCreated(payload: ExpenseCreatedEvent) {
  await this.invalidateCache(payload.groupId);
}

// In NotificationService (listener):
@OnEvent(AppEvent.EXPENSE_CREATED)
async handleExpenseCreated(payload: ExpenseCreatedEvent) {
  for (const userId of payload.affectedUserIds) {
    if (userId === payload.paidById) continue; // Don't notify payer
    await this.createNotification({
      userId,
      type: NotificationType.EXPENSE_ADDED,
      title: 'New expense added',
      body: `${payerName} added "${description}" — you owe ${amount}`,
      metadata: { groupId, expenseId },
    });
    this.sseGateway.pushToUser(userId, { type: 'expense.created', ... });
  }
}
```

### 8.2 SSE (Server-Sent Events) for Real-Time

```typescript
// apps/api/src/modules/notification/notification.gateway.ts

@Controller('events')
export class NotificationGateway {
  private clients = new Map(); // userId → SSE connections

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  async stream(@CurrentUser() user: User, @Res() res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Register client
    const existing = this.clients.get(user.id) ?? [];
    existing.push(res);
    this.clients.set(user.id, existing);

    // Heartbeat every 30s
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

    // Cleanup on disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      const conns = this.clients.get(user.id) ?? [];
      this.clients.set(user.id, conns.filter(c => c !== res));
    });
  }

  pushToUser(userId: string, data: Record) {
    const conns = this.clients.get(userId) ?? [];
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    conns.forEach(res => res.write(payload));
  }
}
```

---

## 9. Export Engine (PDF/CSV)

### 9.1 Export Flow

```
User clicks "Export PDF" → BFF calls GET /groups/:id/export?format=pdf
→ NestJS ExportService:
   1. Query expenses + splits + settlements for date range
   2. Compute per-person summary
   3. Render PDF via @react-pdf/renderer or CSV via papaparse
   4. Stream file back (Content-Disposition: attachment)
```

### 9.2 PDF Template Structure

```
┌─────────────────────────────────────────────┐
│  Kharcha (खर्चा)         Export Date: ...    │
│                                             │
│  Group: Goa Trip 2026                       │
│  Period: Jan 1, 2026 — Mar 31, 2026         │
│  Members: Priya, Marcus, Sana, Dev          │
├─────────────────────────────────────────────┤
│  EXPENSE SUMMARY                            │
│  Total expenses: ₹45,000.00                 │
│  Total transactions: 23                     │
├─────────────────────────────────────────────┤
│  PER-PERSON BREAKDOWN                       │
│  ┌──────────┬──────────┬──────────┐        │
│  │ Member   │ Paid     │ Owes     │ Net    │
│  ├──────────┼──────────┼──────────┤        │
│  │ Priya    │ ₹20,000  │ ₹11,250  │+₹8,750│
│  │ Marcus   │ ₹15,000  │ ₹11,250  │+₹3,750│
│  │ Sana     │ ₹10,000  │ ₹11,250  │-₹1,250│
│  │ Dev      │ ₹0       │ ₹11,250  │-₹11,250│
│  └──────────┴──────────┴──────────┘        │
├─────────────────────────────────────────────┤
│  SIMPLIFIED SETTLEMENTS                     │
│  Dev → Priya:  ₹8,750                      │
│  Dev → Marcus: ₹2,500                      │
│  Sana → Marcus: ₹1,250                     │
├─────────────────────────────────────────────┤
│  ITEMIZED EXPENSES (23 items)               │
│  Date   │ Description │ Paid By │ Amount   │
│  Mar 28 │ Dinner      │ Priya   │ ₹3,500  │
│  ...    │ ...         │ ...     │ ...      │
└─────────────────────────────────────────────┘
```

### 9.3 Rate Limiting

Export endpoints are expensive. Apply stricter limits:

```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 exports per minute
@Get('export')
async exportGroup(...) { ... }
```

---

## 10. Observability & Monitoring

### 10.1 OpenTelemetry Setup

```typescript
// apps/api/src/telemetry/tracing.ts
// MUST be imported FIRST in main.ts (before NestJS bootstrap)

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  serviceName: 'kharcha-api',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-ioredis': { enabled: true },
    }),
  ],
});

sdk.start();
```

### 10.2 Custom Metrics

```typescript
// Key business metrics to track in SigNoz:

// Counters
kharcha.expenses.created       { group_id, split_type, currency }
kharcha.settlements.created    { group_id }
kharcha.exports.generated      { format: pdf|csv, group_id }
kharcha.groups.created         {}
kharcha.users.registered       { provider: email|google }

// Histograms
kharcha.balance.compute_ms     { group_id, member_count }
kharcha.export.generate_ms     { format, expense_count }
kharcha.split.calculate_ms     { split_type, participant_count }

// Gauges
kharcha.sse.active_connections { }
kharcha.redis.cache_hit_rate   { }
```

### 10.3 Alerting Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | 5xx > 1% of requests over 5 min | P1 |
| Balance invariant violation | Zero-sum check fails | P0 (page) |
| Export timeout | PDF generation > 30s | P2 |
| Redis connection lost | Connection pool exhausted | P1 |
| Auth failure spike | 401s > 50/min | P2 |

---

## 11. Infrastructure & Deployment

### 11.1 Docker Compose (Local Dev)

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: kharcha
      POSTGRES_PASSWORD: kharcha_dev
      POSTGRES_DB: kharcha
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass kharcha_dev
    ports:
      - '6379:6379'

  signoz:
    # Optional: local SigNoz for observability dev
    # See https://signoz.io/docs/install/docker
    # Or use SigNoz Cloud and just set OTEL_EXPORTER_OTLP_ENDPOINT

volumes:
  pgdata:
```

### 11.2 NestJS Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @kharcha/shared build
RUN pnpm --filter @kharcha/api build
RUN pnpm --filter @kharcha/api exec prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### 11.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  test-api:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: kharcha_test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @kharcha/api exec prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/kharcha_test
      - run: pnpm --filter @kharcha/api test
      - run: pnpm --filter @kharcha/api test:e2e

  test-web:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @kharcha/web test

  deploy-api:
    if: github.ref == 'refs/heads/main'
    needs: [test-api, test-web]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with: { credentials_json: '${{ secrets.GCP_SA_KEY }}' }
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: kharcha-api
          source: .
          region: asia-south1
```

### 11.4 Deployment Topology

```
Production:
├── Vercel (apps/web)
│   ├── Edge Network (static + RSC)
│   ├── Serverless Functions (BFF Route Handlers)
│   └── Environment: NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, etc.
│
├── GCP Cloud Run (apps/api)
│   ├── Min instances: 1 (avoid cold start)
│   ├── Max instances: 10
│   ├── Memory: 512MB
│   ├── Region: asia-south1 (Mumbai)
│   └── Environment: DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
│
├── Cloud SQL (PostgreSQL 16)
│   ├── Instance: db-f1-micro (dev) → db-custom-2-4096 (prod)
│   ├── Backups: daily, 30-day retention
│   └── Private IP (VPC peering with Cloud Run)
│
├── Memorystore (Redis 7)
│   ├── Instance: basic, 1GB
│   └── Private IP
│
├── Cloud Storage (GCS)
│   ├── Bucket: kharcha-receipts (uploads)
│   ├── Bucket: kharcha-exports (generated PDFs)
│   └── Lifecycle: delete exports after 7 days
│
└── SigNoz Cloud
    └── OTLP endpoint for traces + metrics + logs
```

---

## 12. Testing Strategy

### 12.1 Test Pyramid

```
          ┌──────────┐
          │   E2E    │  5%   Playwright (critical user flows)
         ┌┴──────────┴┐
         │ Integration │ 25%  Supertest + test DB (API endpoints)
        ┌┴────────────┴┐
        │    Unit       │ 70%  Jest/Vitest (services, utils, components)
        └──────────────┘
```

### 12.2 Unit Tests (Critical)

```
packages/shared/
├── split.test.ts              # All 4 split types, edge cases, rounding
├── money.test.ts              # toPaise, toDisplay, formatINR

apps/api/
├── balance/simplify.service.spec.ts   # Debt simplification algorithm
│   - 2 people, simple debt
│   - 3 people, circular debt
│   - 10 people, random amounts
│   - Zero-sum invariant assertion
│   - Empty group (no expenses)
│   - Single member group
├── expense/split-calculator.service.spec.ts
│   - Equal split with remainder
│   - Percentage split summing to 100.01 (error)
│   - Shares 2:1:1 on odd amounts
│   - Exact split not matching total (error)
├── expense/expense.service.spec.ts
│   - Idempotency key deduplication
│   - Non-member cannot add expense

apps/web/
├── components/expenses/split-selector.test.tsx
├── components/balances/balance-summary.test.tsx
├── hooks/use-expenses.test.ts
```

### 12.3 Integration Tests

```
apps/api/test/
├── auth.e2e-spec.ts           # Register → Login → Access protected route
├── groups.e2e-spec.ts         # Create → Invite → Join → List members
├── expenses.e2e-spec.ts       # Create expense → Verify splits → Query
├── balances.e2e-spec.ts       # Add expenses → Check balances → Simplify
├── settlements.e2e-spec.ts    # Settle → Verify balance update
├── export.e2e-spec.ts         # Generate PDF → Verify content
```

### 12.4 E2E Tests (Playwright)

```
apps/web/e2e/
├── auth.spec.ts               # Sign up → Sign in → See dashboard
├── expense-flow.spec.ts       # Create group → Add expense → See balance
├── settlement-flow.spec.ts    # View balances → Record settlement
├── export-flow.spec.ts        # Export PDF → Verify download
```

---

## 13. Environment Configuration

### 13.1 `.env.example`

```bash
# ─── Database ───
DATABASE_URL=postgresql://kharcha:kharcha_dev@localhost:5432/kharcha

# ─── Redis ───
REDIS_URL=redis://:kharcha_dev@localhost:6379

# ─── Auth ───
JWT_SECRET=your-256-bit-secret-here
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── API ───
API_PORT=3001
API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000

# ─── Storage ───
GCS_BUCKET_RECEIPTS=kharcha-receipts-dev
GCS_BUCKET_EXPORTS=kharcha-exports-dev
GCS_PROJECT_ID=
GCS_KEY_FILE=                          # Path to service account JSON

# ─── Observability ───
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=kharcha-api

# ─── Feature Flags ───
ENABLE_RECURRING_EXPENSES=false
ENABLE_RECEIPT_UPLOAD=false
ENABLE_MULTI_CURRENCY=false
```

---

## 14. Security Hardening

### 14.1 Checklist

| Area | Measure | Implementation |
|------|---------|---------------|
| **Transport** | HTTPS everywhere | Vercel + Cloud Run handle TLS termination |
| **Auth** | Bcrypt password hashing | Cost factor 12 |
| **Auth** | JWT expiry | Access: 15min, Refresh: 7 days |
| **Auth** | Account lockout | 5 failed attempts → 15min cooldown (Redis counter) |
| **Input** | DTO validation | class-validator on all endpoints |
| **Input** | SQL injection | Prisma parameterized queries (never raw string concat) |
| **Input** | XSS | React auto-escaping + CSP headers |
| **API** | Rate limiting | @nestjs/throttler: 100 req/min general, 10/min exports |
| **API** | CORS | Explicit origin whitelist (no wildcards in prod) |
| **API** | Helmet | Security headers (X-Frame-Options, CSP, HSTS, etc.) |
| **Data** | Row-level isolation | GroupMemberGuard on all group-scoped endpoints |
| **Data** | Soft deletes | Expenses are never hard-deleted |
| **Uploads** | File validation | Mime type check, 5MB limit, extension whitelist |
| **Secrets** | No hardcoded secrets | All via env vars, GCP Secret Manager in prod |

### 14.2 CSRF Protection

```typescript
// BFF Route Handlers: Use SameSite=Lax cookies (NextAuth default)
// + Double-submit cookie pattern for non-GET requests
// NestJS API: Not needed (JWT Bearer auth, no cookies)
```

---

## 15. Migration & Seed Strategy

### 15.1 Migration Workflow

```bash
# Create a new migration after schema changes
pnpm --filter @kharcha/api exec prisma migrate dev --name add_expense_tags

# Apply migrations in CI/production
pnpm --filter @kharcha/api exec prisma migrate deploy

# Reset dev database (destructive)
pnpm --filter @kharcha/api exec prisma migrate reset
```

### 15.2 Seed Data

```typescript
// apps/api/prisma/seed.ts
// Run: pnpm --filter @kharcha/api exec prisma db seed

async function main() {
  // 1. Create demo users
  const priya = await prisma.user.create({ data: { name: 'Priya', email: 'priya@demo.kharcha.app', ... } });
  const marcus = await prisma.user.create({ data: { name: 'Marcus', email: 'marcus@demo.kharcha.app', ... } });
  const sana = await prisma.user.create({ data: { name: 'Sana', email: 'sana@demo.kharcha.app', ... } });

  // 2. Create demo group
  const group = await prisma.group.create({ data: { name: 'Goa Trip 2026', createdById: priya.id, ... } });

  // 3. Add members
  await prisma.groupMember.createMany({ ... });

  // 4. Create sample expenses with various split types
  // 5. Create sample settlements
}
```

---

## Appendix: Implementation Order (Claude Code Prompt Sequence)

For efficient implementation, follow this order. Each step is a self-contained prompt.

```
Step 1:  Monorepo scaffolding (Turborepo + pnpm + packages/shared)
Step 2:  Docker Compose (Postgres + Redis)
Step 3:  NestJS API bootstrap (app.module, prisma, redis, health check)
Step 4:  Prisma schema + initial migration + seed
Step 5:  Auth module (register, login, JWT strategy, guards)
Step 6:  Next.js app + NextAuth setup + BFF auth routes
Step 7:  User module (profile CRUD)
Step 8:  Group module (CRUD, invite, join)
Step 9:  Expense module (create with splits, list with filters)
Step 10: Balance module (computation, caching, simplification)
Step 11: Settlement module (create, list, balance invalidation)
Step 12: Dashboard UI (balances, groups, recent activity)
Step 13: Expense history UI (filters, search, pagination)
Step 14: Export module (PDF + CSV generation)
Step 15: Notification module (events, SSE, in-app feed)
Step 16: OpenTelemetry integration
Step 17: CI/CD pipelines
Step 18: E2E test suite
```

---

*This spec is the single source of truth for implementation decisions.
Update it when ADRs are revised or architecture evolves.*