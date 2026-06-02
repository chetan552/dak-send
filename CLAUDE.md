# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Does

DakSend is a self-hosted email newsletter/campaign platform. It supports multi-brand subscriber management, campaign scheduling, drip automations, landing page forms, RSS-to-email, A/B testing, open/click tracking, and transactional email via API — all powered by AWS SES.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (port 3000)
npm run worker       # Start BullMQ background email worker (separate process)

# Production
npm run build        # Build Next.js app
npm run start        # Start production server

# Database
npx prisma migrate dev    # Apply migrations and regenerate client
npx prisma migrate deploy # Apply migrations (production)
npx prisma studio         # Open Prisma GUI
npx prisma generate       # Regenerate client after schema changes

# Code quality
npm run lint         # Run ESLint
```

> The worker process (`npm run worker`) must run alongside the web server — it processes the BullMQ email queue that sends all campaign/automation emails.

## Architecture Overview

### Request Flow

```
User Action (UI)
  → Server Action (src/app/actions/)
    → Prisma (PostgreSQL)
    → BullMQ Queue (Redis)
      → Worker Process (src/lib/worker.ts)
        → AWS SES

External Events
  → API Routes (src/app/api/webhooks/)
    → Database updates (bounces, complaints)

Cron Jobs → /api/cron/* → Campaign dispatch / RSS polling / Automation steps
```

### Key Layers

**Server Actions** (`src/app/actions/`) — All business logic lives here. Each file maps to a feature domain: `send.ts` (campaign dispatch), `subscriber.ts`, `automation.ts`, `campaign.ts`, `templates.ts`, `rss.ts`, `analytics.ts`, `warmup.ts`, `ab-test.ts`, `brand.ts`, `segment.ts`, `signup-form.ts`.

**API Routes** (`src/app/api/`) — For external integrations and public endpoints:
- `/api/send` — Transactional email (API key auth via `x-api-key` header)
- `/api/subscribe`, `/api/unsubscribe`, `/api/confirm`, `/api/preferences` — Public subscriber lifecycle
- `/api/track/open`, `/api/track/click` — Tracking pixel and click redirect
- `/api/cron/scheduled`, `/api/cron/rss`, `/api/cron/automations` — Must be called by external cron scheduler with `?secret=CRON_SECRET`
- `/api/webhooks/ses` — SES bounce/complaint processing via SNS

**Worker** (`src/lib/worker.ts`) — Processes BullMQ jobs from `src/lib/queue.ts`. Handles email personalization (`[Name]`, `[Email]`, `[UnsubscribeUrl]`, `[CustomField:FieldName]`), tracking pixel injection, click URL wrapping, and subscriber status updates.

**Segment Engine** (`src/lib/segment-query.ts`) — Evaluates JSON-based segment rules against subscriber data for targeted sends.

### Auth Model

- **Dashboard** — NextAuth JWT sessions (Credentials provider, email/password via bcryptjs)
- **Transactional API** — `x-api-key` header matched against `Setting` table
- **Cron routes** — `?secret=` query param matched against `CRON_SECRET` env var
- **Webhooks** — SNS HMAC signature verification

### Multi-Brand Architecture

Each `User` can access multiple `Brand`s. All campaigns, lists, subscribers, and settings are scoped to a `Brand`. AWS SES credentials can be global (env vars) or per-brand (stored in `Setting` table).

### Database Models (Prisma)

Core models: `User`, `Brand`, `List`, `Subscriber`, `Campaign`, `CampaignSend`, `CampaignClick`, `CustomField`, `Segment`, `Setting`, `Automation`, `AutomationStep`, `AutomationEnrollment`, `EmailTemplate`, `SignupForm`, `RssFeed`, `DomainWarmup`, `AbTestVariant`, `Webhook`.

## Environment Variables

```env
DATABASE_URL=           # PostgreSQL connection (pooled, for Prisma)
DIRECT_URL=             # PostgreSQL direct connection (for migrations)
NEXTAUTH_SECRET=        # Random secret for JWT signing
NEXTAUTH_URL=           # Full app URL (e.g. http://localhost:3000)
NEXT_PUBLIC_APP_URL=    # Used in tracking/unsubscribe URLs injected into emails
REDIS_URL=              # Redis for BullMQ (e.g. redis://localhost:6379)
CRON_SECRET=            # Token required by all /api/cron/* endpoints
AWS_REGION=             # Optional — can also be set per-brand in Settings UI
AWS_ACCESS_KEY_ID=      # Optional — can also be set per-brand in Settings UI
AWS_SECRET_ACCESS_KEY=  # Optional — can also be set per-brand in Settings UI
```

## Local Dev Setup

```bash
docker-compose up -d    # Start PostgreSQL + Redis
cp .env.example .env    # Configure env vars
npx prisma migrate dev  # Set up database
npm run dev             # Start web server
npm run worker          # Start email worker (separate terminal)
```

## Path Alias

All source imports use `@/*` → `./src/*` (configured in `tsconfig.json`).

## UI Components

UI is built with shadcn/ui (`src/components/ui/`) + Tailwind CSS v4 + Radix UI primitives. Rich text email editing uses TipTap v3. The `components.json` file configures the shadcn CLI.

## Production Deployment

The app uses `output: "standalone"` in `next.config.ts`. PM2 is configured via `ecosystem.config.js` to run both the web server and worker process.

## No Test Suite

There is currently no test runner configured in this project.
