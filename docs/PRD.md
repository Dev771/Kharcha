# Product Requirements Document (PRD)
# Kharcha (खर्चा) — Expense Splitting & Tracking Platform

**Document Version:** 1.0  
**Author:** Alex Rivera, Project Manager  
**Date:** March 28, 2026  
**Status:** Draft — Awaiting Stakeholder Review

---

## 1. Overview

### 1.1 Summary

Kharcha is a full-featured expense splitting and tracking application that enables users to log shared expenses, divide costs among individuals or groups, maintain clear per-person ledgers, and generate detailed invoices or expense reports. The platform supports both casual use (roommates, trips) and semi-professional use (freelancer teams, event organizers) through flexible group management, multiple split strategies, and exportable financial summaries.

### 1.2 Goals

| # | Goal | Description |
|---|------|-------------|
| G1 | **Frictionless Expense Logging** | Users can log an expense and split it across participants in under 15 seconds. |
| G2 | **Transparent Balances** | Every user has a real-time, auditable view of who owes whom and why. |
| G3 | **Group-Based Organization** | Expenses are organized into groups (trips, households, events) with independent ledgers. |
| G4 | **Invoice & Report Generation** | Users can export itemized expense lists and settlement summaries as PDF/CSV. |
| G5 | **Settlement Simplification** | The system minimizes the number of transactions needed to settle all debts within a group. |

### 1.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Expense creation time | < 15 seconds (median) | Client-side analytics |
| Monthly active users (MAU) | 5,000 within 6 months of launch | Auth/session tracking |
| Group creation-to-first-expense | < 2 minutes (p90) | Funnel analytics |
| Invoice generation success rate | > 99.5% | Server-side monitoring |
| Debt simplification accuracy | 100% (zero-sum invariant maintained) | Automated test suite |
| User retention (30-day) | > 40% | Cohort analysis |

---

## 2. Target Users

### 2.1 Personas

**Persona 1: "The Roommate" — Priya (24, Software Engineer)**
- Shares a flat with 2 others. Splits rent, groceries, utilities monthly.
- Pain points: Loses track of small shared purchases. Awkward to ask people for money without proof. Spreadsheets get messy fast.
- Needs: Quick expense entry, recurring expense support, clear "you owe / you're owed" dashboard.

**Persona 2: "The Trip Organizer" — Marcus (32, Marketing Manager)**
- Plans group trips 3–4 times a year with 6–12 people.
- Pain points: Different people pay for different things. Some join only part of the trip. Settlement at the end is chaotic.
- Needs: Group creation per trip, ability to include/exclude specific members per expense, end-of-trip settlement summary.

**Persona 3: "The Freelancer Lead" — Sana (29, Design Studio Owner)**
- Manages a small team of 4. Tracks shared software subscriptions, client lunch expenses, co-working fees.
- Pain points: Needs exportable records for tax/accounting. Wants itemized invoices per person per month.
- Needs: CSV/PDF export, category tagging, date-range filtering, per-person expense breakdown.

### 2.2 Common Pain Points (Cross-Persona)

- No single source of truth for shared expenses.
- Manual tracking (spreadsheets, notes) becomes unreliable past 10+ transactions.
- Settlement calculations are error-prone when done manually.
- Lack of historical records makes disputes hard to resolve.
- No easy way to generate a clean expense report for a specific period or group.

---

## 3. Features

### 3.1 Feature Priority Matrix

Features are prioritized using MoSCoW (Must / Should / Could / Won't for v1).

### 3.2 Must Have (P0) — MVP

**F1: User Authentication & Profiles**
- *As a user, I want to sign up and log in so that my expenses are tied to my identity.*
- Email/password + OAuth (Google). Profile includes name, avatar, default currency.

**F2: Group Management**
- *As a user, I want to create groups (e.g., "Goa Trip 2026", "Flat 4B") so that expenses are organized by context.*
- Create, rename, archive groups. Invite members via link or email. Each group has its own independent ledger.

**F3: Expense Creation with Flexible Splitting**
- *As a user, I want to add an expense and split it among group members so that everyone knows their share.*
- Split strategies: Equal, exact amounts, percentage-based, shares (e.g., 2:1:1).
- Each expense records: payer, amount, currency, description, category, date, participants, split type.

**F4: Real-Time Balance Dashboard**
- *As a user, I want to see a summary of what I owe and what I'm owed across all groups.*
- Per-group and aggregate views. Net balance per person pair. Visual indicators (green = owed to you, red = you owe).

**F5: Settlement Tracking**
- *As a user, I want to record a payment/settlement so that balances update when someone pays back.*
- Manual settlement entry. Marks specific debts as partially or fully settled.

**F6: Debt Simplification Engine**
- *As a user, I want the app to minimize the number of payments needed to settle all debts in a group.*
- Algorithm: Net balance calculation → minimum cash flow optimization (graph-based).
- Example: If A owes B ₹500 and B owes C ₹500, suggest A pays C ₹500 directly (1 transaction instead of 2).

**F7: Expense History & Filtering**
- *As a user, I want to browse and filter past expenses by group, date, category, or person.*
- Sortable, filterable list view with search. Pagination for large groups.

### 3.3 Should Have (P1) — Post-MVP

**F8: Invoice / Expense Report Export**
- *As a user, I want to export a detailed expense report as PDF or CSV for a specific group and date range.*
- Includes: itemized expense list, per-person breakdown, settlement summary, group metadata.
- PDF uses a clean, branded template. CSV is machine-readable for accounting tools.

**F9: Expense Categories & Tags**
- *As a user, I want to categorize expenses (Food, Travel, Utilities, etc.) so I can analyze spending patterns.*
- Pre-defined categories + custom tags. Category-based spending breakdown in dashboard.

**F10: Recurring Expenses**
- *As a user, I want to set up recurring expenses (e.g., monthly rent) so I don't have to re-enter them.*
- Frequency: weekly, monthly, custom. Auto-creates expense entries on schedule.

**F11: Activity Feed & Notifications**
- *As a user, I want to be notified when someone adds an expense that involves me or when I receive a settlement.*
- In-app notification feed. Push notifications (mobile) and email digests (configurable).

### 3.4 Could Have (P2) — Future Enhancements

**F12: Multi-Currency Support**
- Expenses in different currencies with conversion at time of entry (exchange rate API).

**F13: Receipt Image Attachment**
- Attach photos of receipts to expenses. OCR-based auto-fill (amount, vendor, date) as a stretch goal.

**F14: Comments & Dispute Resolution**
- Comment thread per expense for discussions/disputes.

**F15: Analytics Dashboard**
- Spending trends over time, category breakdowns, top spenders, group activity heatmaps.

### 3.5 Won't Have (v1)

- Direct bank/UPI payment integration (out of scope — settlement is tracked, not executed).
- Shared budgeting or savings goals.
- Business/enterprise tier with role-based access control.

---

## 4. Technical Requirements

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Next.js Web │  │ React Native│  │   PWA        │ │
│  │  (App Router)│  │  (Future)   │  │  (Future)    │ │
│  └──────┬──────┘  └─────────────┘  └─────────────┘ │
│         │                                            │
│         ▼                                            │
│  ┌─────────────────────────────┐                    │
│  │  BFF / API Gateway (Next.js │                    │
│  │  Route Handlers)            │                    │
│  └──────┬──────────────────────┘                    │
└─────────┼───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                  Service Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Auth     │ │ Expense  │ │ Group    │            │
│  │ Service  │ │ Service  │ │ Service  │            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       │            │            │                    │
│  ┌────┴────┐ ┌─────┴────┐ ┌────┴──────┐           │
│  │Settlement│ │ Invoice  │ │Notification│           │
│  │ Engine  │ │ Service  │ │ Service   │           │
│  └─────────┘ └──────────┘ └───────────┘           │
└─────────┬───────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                   Data Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │PostgreSQL│  │  Redis   │  │  GCS/S3  │          │
│  │ (Primary)│  │ (Cache & │  │ (Receipts│          │
│  │          │  │ Sessions)│  │  & PDFs) │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

### 4.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14+ (App Router), Tailwind CSS, shadcn/ui | SSR/SSG for SEO, RSC for performance, familiar stack |
| **BFF** | Next.js Route Handlers | Colocated API layer, session management, request aggregation |
| **Backend** | NestJS (monorepo, modular) | Enterprise-grade DI, decorators, guards, interceptors — maps well to domain-driven services |
| **Auth** | Keycloak (single realm, social login) or NextAuth.js v5 | Keycloak if self-hosted control is needed; NextAuth for faster MVP |
| **Database** | PostgreSQL 16 | ACID compliance, JSONB for flexible metadata, strong ecosystem |
| **ORM** | Prisma | Type-safe queries, migrations, introspection |
| **Cache** | Redis | Session store, balance caching, rate limiting |
| **Object Storage** | GCS or S3 | Receipt images, generated PDFs |
| **PDF Generation** | Puppeteer (server-side) or @react-pdf/renderer | Branded invoice/report templates |
| **Observability** | SigNoz + OpenTelemetry | Distributed tracing, metrics, log correlation |
| **CI/CD** | GitHub Actions | Lint → Test → Build → Deploy pipeline |
| **Hosting** | Vercel (frontend) + GCP Cloud Run (backend) | Scalable, cost-effective for early stage |

### 4.3 Core Data Model (Simplified)

```
User
├── id (UUID)
├── email (unique)
├── name
├── avatar_url
├── default_currency
└── created_at

Group
├── id (UUID)
├── name
├── description
├── created_by → User.id
├── invite_code (unique, short)
├── is_archived (boolean)
└── created_at

GroupMember
├── group_id → Group.id
├── user_id → User.id
├── role (admin | member)
└── joined_at

Expense
├── id (UUID)
├── group_id → Group.id
├── paid_by → User.id
├── amount (decimal, 2dp)
├── currency (ISO 4217)
├── description
├── category
├── tags (text[])
├── split_type (equal | exact | percentage | shares)
├── date
├── receipt_url (nullable)
├── is_recurring (boolean)
├── recurrence_rule (nullable, RRULE format)
└── created_at

ExpenseSplit
├── id (UUID)
├── expense_id → Expense.id
├── user_id → User.id
├── owed_amount (decimal, 2dp)
└── is_settled (boolean)

Settlement
├── id (UUID)
├── group_id → Group.id
├── paid_by → User.id
├── paid_to → User.id
├── amount (decimal, 2dp)
├── note
└── created_at
```

### 4.4 Key API Endpoints (REST)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

POST   /api/groups
GET    /api/groups
GET    /api/groups/:id
POST   /api/groups/:id/invite
POST   /api/groups/:id/join/:inviteCode

POST   /api/groups/:id/expenses
GET    /api/groups/:id/expenses?category=&from=&to=&page=
GET    /api/expenses/:id
PUT    /api/expenses/:id
DELETE /api/expenses/:id

GET    /api/groups/:id/balances
GET    /api/groups/:id/balances/simplified

POST   /api/groups/:id/settlements
GET    /api/groups/:id/settlements

GET    /api/groups/:id/export?format=pdf|csv&from=&to=
GET    /api/users/me/summary
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target |
|--------|--------|
| API response time (p95) | < 200ms for reads, < 500ms for writes |
| Balance calculation | < 100ms for groups up to 50 members |
| PDF generation | < 5 seconds for reports up to 500 expenses |
| Frontend LCP (Largest Contentful Paint) | < 2.5 seconds |
| Database query time (p99) | < 50ms with proper indexing |

### 5.2 Security

- All API endpoints authenticated (JWT or session-based).
- Group data is tenant-isolated — users can only access groups they belong to.
- Row-level security (RLS) in PostgreSQL as a defense-in-depth layer.
- Input validation on all endpoints (class-validator in NestJS, Zod on the frontend).
- Rate limiting: 100 req/min per user (general), 10 req/min for export endpoints.
- CSRF protection on all state-changing operations.
- Receipt uploads: file type validation, size limits (5MB), virus scanning (ClamAV or equivalent).
- Secrets managed via environment variables (never committed). Vault for production.

### 5.3 Scalability

- Stateless backend services — horizontal scaling via Cloud Run auto-scaling.
- Redis cache for hot balance data (invalidated on expense/settlement writes).
- Database connection pooling (PgBouncer).
- Pagination on all list endpoints (cursor-based for expense history).
- CDN for static assets (Vercel Edge or Cloudflare).
- Designed for up to 100K users and 10M expenses in v1 without architectural changes.

### 5.4 Reliability

- 99.9% uptime target.
- Automated database backups (daily, 30-day retention).
- Idempotent write operations (expense creation uses client-generated idempotency keys).
- Graceful degradation: if PDF service is down, queue the export and notify user when ready.

### 5.5 Accessibility

- WCAG 2.1 AA compliance.
- Keyboard navigable expense entry and settlement flows.
- Screen reader support for balance summaries.

---

## 6. Timeline & Milestones

### Phase 1: Foundation (Weeks 1–3)

| Week | Deliverable |
|------|-------------|
| 1 | Project scaffolding: Next.js app, NestJS API, PostgreSQL schema, Prisma setup, CI pipeline |
| 2 | Auth flow (registration, login, session management), User profile CRUD |
| 3 | Group CRUD, invite link generation and join flow, GroupMember management |

**Milestone: Users can sign up, create groups, and invite members.**

### Phase 2: Core Expense Engine (Weeks 4–6)

| Week | Deliverable |
|------|-------------|
| 4 | Expense creation with all 4 split types, ExpenseSplit ledger entries |
| 5 | Balance calculation engine, per-group and aggregate balance APIs |
| 6 | Settlement recording, debt simplification algorithm, settlement suggestions |

**Milestone: Full expense lifecycle — create, split, view balances, settle.**

### Phase 3: Dashboard & History (Weeks 7–8)

| Week | Deliverable |
|------|-------------|
| 7 | Dashboard UI: balance summary cards, group overview, recent activity |
| 8 | Expense history with filtering (date, category, person), search, pagination |

**Milestone: Users have a complete, navigable view of all financial activity.**

### Phase 4: Export & Polish (Weeks 9–10)

| Week | Deliverable |
|------|-------------|
| 9 | PDF and CSV export (per group, date range, per person), invoice template |
| 10 | Categories & tags, recurring expense setup, notification system (in-app) |

**Milestone: Production-ready MVP with export capabilities.**

### Phase 5: Beta & Launch (Weeks 11–12)

| Week | Deliverable |
|------|-------------|
| 11 | Closed beta with 50–100 users, bug triage, performance profiling |
| 12 | Public launch, monitoring dashboards (SigNoz), on-call runbook |

**Milestone: Public launch. Monitoring and alerting active.**

### Post-Launch Roadmap

| Timeframe | Feature |
|-----------|---------|
| Month 4 | Multi-currency support |
| Month 5 | Receipt attachment + OCR |
| Month 6 | React Native mobile app |
| Month 7+ | Analytics dashboard, comments/disputes |

---

## 7. Risks & Dependencies

### 7.1 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Rounding errors in splits** — unequal splits with decimals can cause 1-cent discrepancies that break the zero-sum invariant. | High | High | Assign remainder cents to the payer. All split calculations use integer arithmetic (store as cents/paise). Automated invariant checks on every write. |
| R2 | **Debt simplification edge cases** — cycles, negative balances, or floating point drift in the graph algorithm. | Medium | High | Use the min-cash-flow algorithm with BigDecimal. Comprehensive test suite with adversarial inputs (50+ member groups, circular debts). |
| R3 | **Slow balance queries at scale** — recalculating balances from expense history on every request. | Medium | Medium | Materialized balance cache in Redis, invalidated on writes. Fallback to DB aggregate query if cache miss. |
| R4 | **PDF generation bottleneck** — Puppeteer is resource-heavy and can OOM under concurrent load. | Medium | Medium | Queue-based generation (Bull/BullMQ). Rate limit export endpoint. Consider @react-pdf/renderer as lighter alternative. |
| R5 | **User adoption / cold start** — app is useless alone, requires friends to also sign up. | High | High | Invite-based onboarding flow. Allow adding "non-user" participants (tracked by name, converted when they sign up). Email/link-based settlement reminders. |
| R6 | **Scope creep toward payment integration** — users will inevitably ask "why can't I just pay from here?" | High | Medium | Explicitly out of scope for v1. Provide clear UPI/PayPal deep links as a compromise. Revisit in v2 based on demand data. |

### 7.2 Dependencies

| Dependency | Owner | Risk Level | Contingency |
|------------|-------|-----------|-------------|
| Keycloak / NextAuth setup | Backend team | Low | NextAuth is faster for MVP; Keycloak can be swapped in later if self-hosted control is needed |
| Exchange rate API (for multi-currency, P2) | External (e.g., Open Exchange Rates) | Low | Cache rates daily. Fallback to manual entry if API is down. |
| GCS/S3 bucket provisioning | DevOps | Low | Use local filesystem in dev. GCS in staging/prod. |
| SigNoz deployment | DevOps | Low | SigNoz Cloud as managed alternative. App functions without observability (non-blocking). |
| PDF template design | Design team | Medium | Use a simple HTML-to-PDF template initially. Polish in Phase 4. |

---

## Appendix A: Open Questions

1. **Auth strategy decision**: Keycloak (heavier, more control) vs. NextAuth v5 (lighter, faster MVP)? Recommend NextAuth for Phase 1, migrate to Keycloak if RBAC/enterprise needs emerge.
2. **Mobile strategy**: PWA first or React Native from the start? Recommend PWA for MVP, native app post-launch.
3. **Monetization model** (if any): Freemium with limits on group size / export frequency? Ad-supported? Needs stakeholder input.
4. **Data residency**: Any compliance requirements (GDPR, etc.) based on target geography?

---

*This is a living document. All sections are subject to revision based on stakeholder feedback, technical spikes, and user research findings.*