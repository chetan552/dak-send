<div align="center">

<img src="public/logo.svg" alt="DakSend" width="220" />

**The self-hosted email platform for teams who care about deliverability, data ownership, and price.**

[Features](#features) · [Quick Start](#quick-start) · [REST API](#rest-api-v1) · [n8n Integration](#n8n-integration) · [Deployment](#deployment)

</div>

---

## Overview

DakSend is a production-ready, self-hosted email newsletter and marketing automation platform built on top of Amazon SES. It gives you a modern dashboard for managing multi-brand subscriber lists, campaigns, drip automations, landing pages, and transactional email — at a fraction of the cost of hosted alternatives like Mailchimp, ConvertKit, or Klaviyo.

Under the hood it's a Next.js 16 app backed by PostgreSQL, Redis, and BullMQ, with a dedicated worker process that handles the hot path: personalization, tracking injection, warmup enforcement, and SES delivery.

---

## Features

### Subscriber & list management
- **Multi-brand architecture** — unlimited sender identities, each with isolated lists, campaigns, templates, and SES configuration
- **Lists & segments** — rule-based segmentation over email, status, custom fields, engagement, and tags
- **Custom fields** — define arbitrary fields per list and use them in personalization (`[CustomField:FirstName]`, etc.)
- **CSV import/export** — bulk import subscribers with custom field mapping; export any list to CSV
- **GDPR consent tracking** — per-subscriber consent flags, confirmation timestamps, and preference center
- **Double opt-in** — optional per-list confirmation flow with branded confirmation emails
- **Subscriber preference center** — public `/preferences` page where recipients manage their own subscriptions
- **Signup forms & landing pages** — visual form builder with public `/f/[slug]` pages and embeddable widgets

### Campaigns
- **Rich-text + HTML editor** — TipTap WYSIWYG with raw HTML source mode via CodeMirror
- **Template library** — save, reuse, and fork email templates across campaigns and automations
- **Image library & uploads** — host and reuse images directly from the editor
- **Multi-client preview** — in-app rendering simulation for Gmail, Outlook, and Apple Mail
- **Test sends** — fire a preview email to any address with live personalization
- **Scheduled sending** — pick a future date/time; a cron dispatcher picks it up and queues delivery
- **A/B testing** — split-test subject lines or bodies, auto-pick winners from live engagement data
- **Send-time optimization** — per-subscriber delivery delay based on their historical engagement hour
- **RSS-to-email** — auto-generate campaign drafts from any RSS feed on a schedule

### Automation
- **Visual drip builder** — chain email, delay, and conditional-split steps
- **Enrollment triggers** — enroll subscribers on signup, tag, segment match, or API call
- **Step-level personalization** — same template engine as campaigns, scoped per step

### Deliverability & reputation
- **Domain warmup** — 14-day ramp-up schedule that enforces daily send caps with automatic campaign truncation
- **Deliverability monitoring** — SPF, DKIM, DMARC, and MX health checks per sending domain
- **Bounce & complaint handling** — SES → SNS webhooks with HMAC signature verification; brand-scoped complaint routing via email tags
- **Suppression** — auto-unsubscribe on hard bounces; complaint suppression scoped per brand
- **Safe webhook URLs** — outbound webhook targets are validated against SSRF attacks

### Tracking & analytics
- **Open tracking** — transparent pixel injection with per-send logs
- **Click tracking** — link wrapping through a redirect proxy
- **Campaign dashboards** — real-time open rate, click rate, bounce rate, and complaint rate
- **Per-subscriber engagement history** — aggregate activity rolls up into send-time optimization

### Integrations & APIs
- **Transactional email API** — `POST /api/send` for receipts, notifications, and one-off messages
- **REST API v1** — full CRUD over brands, lists, subscribers, campaigns, and webhooks for external automation
- **n8n community node** — first-party [`n8n-nodes-daksend`](packages/n8n-nodes-daksend) package with both regular actions and a webhook trigger
- **Outgoing webhooks** — HMAC-signed event delivery on `subscribe`, `unsubscribe`, `open`, `click`, `bounce`, `complaint`
- **Incoming SES webhooks** — production-grade SNS signature verification and bounce/complaint processing

### Administration
- **Role-based access** — admin and standard user roles with brand-level permissions
- **Per-brand SES credentials** — override global AWS keys on a per-brand basis via the Settings UI
- **Rate-limited public endpoints** — Redis-backed rate limiting on `/api/subscribe` and other public routes
- **Audit-friendly** — all business logic lives in auditable server actions, not client code

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React Server Components) |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Email | Amazon SES v2 |
| Auth | NextAuth.js (Credentials provider, JWT sessions) |
| UI | Tailwind CSS v4, Radix UI, shadcn/ui, Lucide Icons |
| Editor | TipTap v3 (rich text) + CodeMirror 6 (HTML source) |
| Deployment | PM2 (`ecosystem.config.js`) or Vercel + separate worker host |

---

## Architecture

```
User action (UI)
  └─► Server action  ─►  Prisma (PostgreSQL)
                     ─►  BullMQ queue (Redis)
                             └─► Worker process  ─►  AWS SES
                                                 ─►  Warmup counter
                                                 ─►  Tracking injection
                                                 ─►  Outgoing webhook dispatch

External events
  └─► SES/SNS  ─►  /api/webhooks/ses  ─►  Bounce/complaint suppression
  └─► Cron     ─►  /api/cron/*         ─►  Scheduled campaigns, RSS polling, automations
```

The worker process (`npm run worker`) is **required** alongside the web server — it drains the BullMQ queue, handles personalization, and sends through SES. Without it, queued emails will sit idle.

---

## Prerequisites

- **Node.js** 20 or newer
- **PostgreSQL** 14+ (Neon, Supabase, RDS, or self-hosted)
- **Redis** 6+ (for the BullMQ queue)
- **AWS SES account** with a verified sender identity

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/dak-send.git
cd dak-send
npm install
```

### 2. Start dependencies

If you don't already have Postgres and Redis running, the included `docker-compose.yml` spins up both:

```bash
docker-compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/daksend"
DIRECT_URL="postgresql://user:password@localhost:5432/daksend"  # Same as DATABASE_URL in most cases; separate when using a pooler

# NextAuth
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# Public URLs (used in tracking + unsubscribe links embedded in emails)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Queue
REDIS_URL="redis://localhost:6379"

# Cron security (required for /api/cron/* endpoints)
CRON_SECRET="$(openssl rand -hex 24)"

# AWS SES — optional here, can also be set per-brand via the UI
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
```

### 4. Migrate and seed the database

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed        # Creates an initial admin user
```

### 5. Run the app

Two processes are required — run each in its own terminal:

```bash
npm run dev        # Next.js web server on :3000
npm run worker     # BullMQ email worker
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded admin credentials.

---

## Cron Jobs

Three cron endpoints drive the time-based features. All require a `?secret=` query parameter matching `CRON_SECRET`.

| Endpoint | Purpose | Recommended Interval |
|----------|---------|----------------------|
| `GET /api/cron/scheduled` | Dispatch campaigns whose `scheduledAt` has passed | Every 1 minute |
| `GET /api/cron/rss` | Poll RSS feeds and draft new campaigns | Every 15–60 minutes |
| `GET /api/cron/automations` | Advance subscribers through automation steps | Every 1–5 minutes |

**crontab example:**

```bash
* * * * * curl -fsS "https://your-domain.com/api/cron/scheduled?secret=YOUR_CRON_SECRET"
*/2 * * * * curl -fsS "https://your-domain.com/api/cron/automations?secret=YOUR_CRON_SECRET"
*/30 * * * * curl -fsS "https://your-domain.com/api/cron/rss?secret=YOUR_CRON_SECRET"
```

**Vercel `vercel.json`:**

```json
{
  "crons": [
    { "path": "/api/cron/scheduled?secret=YOUR_CRON_SECRET", "schedule": "* * * * *" },
    { "path": "/api/cron/automations?secret=YOUR_CRON_SECRET", "schedule": "*/2 * * * *" },
    { "path": "/api/cron/rss?secret=YOUR_CRON_SECRET", "schedule": "*/30 * * * *" }
  ]
}
```

---

## Public & Transactional APIs

### Transactional email — `POST /api/send`

```bash
curl -X POST https://your-domain.com/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "to": "user@example.com",
    "from": "Receipts <receipts@yourdomain.com>",
    "subject": "Your receipt",
    "html": "<h1>Thank you!</h1><p>Your order is confirmed.</p>"
  }'
```

Set `API_KEY` via the Settings page or directly in the `Setting` table.

### Public subscribe — `POST /api/subscribe`

```bash
curl -X POST https://your-domain.com/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "listId": "your-list-id",
    "email": "subscriber@example.com",
    "name": "Jane Doe"
  }'
```

Redis-backed rate limiting is enforced per-IP.

### SES bounce / complaint handler

Point your SES → SNS topic at:

```
POST https://your-domain.com/api/webhooks/ses
```

SNS signature verification is enforced. Hard bounces suppress globally; complaints are scoped to the originating brand via the `campaign_id` email tag.

---

## REST API v1

A full REST API for external integrations lives under `/api/v1`. Authenticate with `x-api-key: YOUR_API_KEY`.

| Resource | Endpoints |
|----------|-----------|
| Brands | `GET /api/v1/brands` |
| Lists | `GET /api/v1/lists` |
| Subscribers | `GET /api/v1/subscribers`, `POST /api/v1/subscribers`, `GET /api/v1/subscribers/:email`, `PATCH /api/v1/subscribers/:email`, `DELETE /api/v1/subscribers/:email` |
| Campaigns | `GET /api/v1/campaigns`, `GET /api/v1/campaigns/:id` (includes computed open/click/bounce rates) |
| Webhooks | `GET /api/v1/webhooks`, `POST /api/v1/webhooks`, `GET /api/v1/webhooks/:id`, `PATCH /api/v1/webhooks/:id`, `DELETE /api/v1/webhooks/:id` |

Webhook creation validates URLs against SSRF and auto-generates a signing secret if one isn't provided.

---

## n8n Integration

A first-party n8n community node lives at [`packages/n8n-nodes-daksend`](packages/n8n-nodes-daksend).

**Two nodes are included:**

- **DakSend** — action node for subscriber CRUD, campaign lookups, and transactional sends
- **DakSend Trigger** — webhook trigger that auto-registers itself with your DakSend instance on workflow activation and fires on `subscribe`, `unsubscribe`, `open`, `click`, `bounce`, or `complaint` events

**Installation:**

```bash
cd packages/n8n-nodes-daksend
npm install
npm run build
# Then install into n8n's custom node directory, or publish and install from the n8n UI
```

Configure credentials with your DakSend base URL and API key, and the nodes are ready to use.

---

## Deployment

DakSend is configured for both PM2-based VPS deployment and Vercel.

### PM2 (self-hosted)

```bash
npm run build
pm2 start ecosystem.config.js
```

The `ecosystem.config.js` file runs both the web server and the worker process under PM2 supervision.

### Vercel

- Deploy the web app to Vercel as usual
- **Run the worker separately** — Vercel functions are short-lived and cannot host BullMQ. Use Railway, Fly.io, a $5/mo VPS, or any Node host for `npm run worker`
- Configure the cron endpoints via `vercel.json` (see above)
- Point your database at Neon/Supabase/RDS and Redis at Upstash/Redis Cloud

### Production checklist

- [ ] Postgres `DATABASE_URL` + `DIRECT_URL` configured (separate `DIRECT_URL` for migrations if using a pooler like PgBouncer)
- [ ] Redis reachable from both web and worker processes
- [ ] `NEXTAUTH_SECRET` and `CRON_SECRET` set to strong random values
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain (used in tracking + unsubscribe links)
- [ ] SES sender domain verified with SPF, DKIM, and DMARC records
- [ ] SES sandbox exited (`AWS SES Console → Account Dashboard → Request Production Access`)
- [ ] Worker process running (`pm2 ls` or equivalent)
- [ ] Cron endpoints scheduled
- [ ] SNS topic configured for bounce/complaint webhooks

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── actions/          # Server actions — all business logic
│   │   ├── api/
│   │   │   ├── v1/           # REST API v1 (external integrations)
│   │   │   ├── cron/         # Time-based dispatchers
│   │   │   ├── webhooks/     # Incoming SES/SNS handlers
│   │   │   ├── send/         # Transactional email API
│   │   │   └── subscribe/    # Public signup API
│   │   ├── dashboard/        # Authenticated dashboard pages
│   │   ├── login/            # Auth pages
│   │   └── f/[slug]/         # Public landing page forms
│   ├── components/           # React components (shadcn/ui + custom)
│   └── lib/                  # Shared utilities
│       ├── prisma.ts         # Prisma client singleton
│       ├── queue.ts          # BullMQ producer
│       ├── worker.ts         # BullMQ consumer (run via `npm run worker`)
│       ├── warmup.ts         # Domain warmup enforcement
│       ├── segment-query.ts  # Segment rule evaluator
│       ├── webhooks.ts       # Outgoing webhook dispatcher
│       └── validators.ts     # Input validators (SSRF-safe URL checks, etc.)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── packages/
│   └── n8n-nodes-daksend/    # n8n community node package
├── public/                   # Static assets (logo, icons)
└── ecosystem.config.js       # PM2 config
```

---

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on :3000
npm run worker       # Start BullMQ worker (required for sending)

# Production
npm run build        # Build Next.js app (standalone output)
npm start            # Start production server

# Database
npx prisma migrate dev      # Create + apply a new migration
npx prisma migrate deploy   # Apply pending migrations (production)
npx prisma studio           # Open Prisma GUI
npx prisma generate         # Regenerate client after schema changes
npx prisma db seed          # Seed initial admin user

# Code quality
npm run lint         # Run ESLint
```

---

## Security

- All dashboard routes are protected by NextAuth JWT sessions
- Public API endpoints (`/api/subscribe`) are Redis-rate-limited per IP
- Outgoing webhook URLs are validated against SSRF attacks (no localhost, private IPs, or link-local addresses)
- Incoming SNS notifications are verified against AWS's public certificate chain
- Outgoing webhook payloads are signed with HMAC-SHA256 (`X-Webhook-Signature` header)
- Transactional API and v1 REST API require an API key stored in the `Setting` table
- Cron endpoints require a shared secret query parameter

If you discover a security issue, please email security@yourdomain.com rather than opening a public issue.

---

## License

MIT
