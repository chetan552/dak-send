<div align="center">

<img src="public/logo.svg" alt="DakSend" width="220" />

**The self-hosted email platform for teams who care about deliverability, data ownership, and price.**

[Features](#features) · [Quick Start](#quick-start) · [REST API](#rest-api-v1) · [n8n Integration](#n8n-integration) · [Deployment](#deployment) · [Q&A Setup Guide](#qa-setup-guide) · [RSS Digest for Drupal](#rss-digest-for-drupal-or-any-cms)

</div>

---

## Overview

DakSend is a production-ready, self-hosted email newsletter and marketing automation platform built on top of Amazon SES. It gives you a modern dashboard for managing multi-brand subscriber lists, campaigns, drip automations, landing pages, and transactional email — at a fraction of the cost of hosted alternatives like Mailchimp, ConvertKit, or Klaviyo.

Under the hood it's a Next.js app backed by PostgreSQL, Redis, and BullMQ, with a dedicated worker process that handles the hot path: personalization, CSS inlining, tracking injection, warmup enforcement, and SES delivery.

---

## Features

### Subscriber & list management
- **Multi-brand architecture** — unlimited sender identities, each with isolated lists, campaigns, templates, and SES configuration
- **Lists & segments** — rule-based segmentation over email, status, custom fields, engagement, and tags
- **Custom fields** — define arbitrary fields per list and use them in personalization (`[CustomField:FirstName]`, etc.)
- **Copy custom fields** — when creating a new list, copy the custom field schema from any existing list in one click
- **Delete lists** — permanently remove a list and all its subscribers, fields, and segments (with confirmation prompt)
- **CSV import/export** — bulk import subscribers with custom field mapping; export any list to CSV
- **GDPR consent tracking** — per-subscriber consent flag, timestamp, IP address, and source (`form`, `api`, `confirm`, `import`); immutable audit log of consent events, data exports, and admin deletions
- **Double opt-in** — optional per-list confirmation flow with branded confirmation emails
- **Subscriber preference center** — public `/preferences` page where recipients manage their own subscriptions
- **Signup forms & landing pages** — visual form builder with public `/f/[slug]` pages and embeddable widgets

### Campaigns
- **Block-based email builder** — drag-and-drop visual editor with 8 block types (Text, Heading, Image, Button, Divider, Spacer, Two Columns, Raw HTML); compiles to Outlook-safe table HTML; undo/redo history; full-screen live preview
- **Rich-text + HTML editor** — TipTap WYSIWYG with raw HTML source mode via CodeMirror
- **Editor choice at creation** — choose Block Builder or HTML Editor when creating a campaign; existing campaigns auto-detect which mode was used
- **Template library** — save, reuse, and fork email templates across campaigns and automations
- **Image library & uploads** — host and reuse images directly from the editor
- **Multi-client preview** — in-app rendering simulation for Gmail, Outlook, and Apple Mail
- **Test sends** — fire a preview email to any address with live personalization
- **Scheduled sending** — pick a future date/time; a cron dispatcher picks it up and queues delivery
- **A/B testing** — split-test subject lines or bodies, auto-pick winners from live engagement data
- **Send-time optimization** — per-subscriber delivery delay based on their historical engagement hour
- **RSS-to-email** — auto-generate campaign drafts from any RSS feed on a schedule; **Daily Digest Mode** batches all new items from a run into one email instead of one email per item

### Deliverability
- **Outlook-safe HTML pipeline** — every email is automatically wrapped in a proper `<!DOCTYPE html>` document with MSO conditionals; CSS styles are inlined via `juice` so Outlook renders them correctly
- **Multipart/alternative sends** — every campaign includes both an HTML and a plain-text part, a hard requirement for avoiding spam filters at Yahoo and Gmail
- **RFC-compliant unsubscribe headers** — `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` are automatically added to all bulk sends so Gmail and Yahoo display their native unsubscribe chip
- **One-click unsubscribe POST endpoint** — bulk mailbox providers can unsubscribe recipients server-side without any user interaction, satisfying the 2024 bulk-sender rules
- **Feedback-ID header** — `Feedback-ID` header is set on all campaign sends for Gmail Postmaster Tools attribution
- **`Precedence: bulk` header** — correctly classifies campaigns as bulk mail to mailbox providers
- **Domain warmup** — 14-day ramp-up schedule that enforces daily send caps with automatic campaign truncation
- **Deliverability dashboard** — per-brand subscriber health breakdown (subscribed / unsubscribed / bounced / complained counts) with color-coded bounce and complaint rate badges against industry thresholds; recent issues log
- **Suppression list** — global and brand-scoped suppression entries; hard bounces are auto-suppressed globally, complaints are auto-suppressed per brand via SES notifications; manual add/remove with reason and note; suppressed addresses are filtered at dispatch time even if still subscribed
- **Bounce & complaint handling** — SES → SNS webhooks with HMAC signature verification; brand-scoped complaint routing via email tags; auto-populates suppression list
- **Resubscribe** — one-click resubscribe for any unsubscribed/bounced/complained subscriber; clears brand-scoped suppression and `pausedUntil` in one action; warns if a global suppression still blocks delivery

### Tracking & analytics
- **Open tracking** — transparent pixel injection with per-send logs; can be disabled per campaign at send time
- **Click tracking** — link wrapping through a redirect proxy; can be disabled per campaign at send time
- **Per-campaign tracking toggles** — choose at send time whether opens and/or clicks are tracked; setting is persisted on the campaign record for audit purposes
- **Campaign dashboards** — real-time open rate, click rate, bounce rate, and complaint rate
- **Per-subscriber engagement history** — aggregate activity rolls up into send-time optimization

### Subscriber & list management
- **Subscriber tags** — create free-form tags per brand and apply them to individual subscribers; use `has_tag` in segment rules for tag-based targeting
- **Subscriber pause** — subscribers can pause emails for 30, 60, or 90 days from the preference center; paused subscribers are skipped at dispatch time
- **Preference center** — public `/preferences?i=<id>` page where subscribers manage per-list opt-ins, pause emails, and unsubscribe from everything; `[PreferencesUrl]` merge tag auto-inserts the link; footer auto-injects "Manage Preferences" link alongside "Unsubscribe"

### Automations
- **Drip automations** — multi-step delay + email sequences triggered automatically
- **Subscriber triggers** — start a sequence when someone joins a list (single opt-in) or confirms (double opt-in)
- **Event-based triggers** — fire an automation when a named subscriber event is tracked via the `/api/v1/events` endpoint (e.g. `purchase`, `login`, `trial_started`)
- **Inbound Webhook Trigger** — each automation gets a unique URL; any external system can `POST` to it with `{ email, name }` to enroll a subscriber using a per-automation Bearer token
- **API Trigger** — enroll subscribers into an automation via `POST /api/v1/automations/:id/enroll` using your existing API key; ideal for CRM and no-code tool integrations

### Integrations & APIs
- **Transactional email API** — `POST /api/send` for receipts, notifications, and one-off messages
- **REST API v1** — full CRUD over brands, lists, subscribers, campaigns, webhooks, and automation enrollment
- **Subscriber events API** — `POST /api/v1/events` to track named events against a subscriber; triggers event-based automations and feeds segment rules
- **Tags API** — `GET/POST/DELETE /api/v1/tags` and `GET/POST/DELETE /api/v1/subscribers/:email/tags` for programmatic tag management
- **n8n community node** — first-party [`n8n-nodes-daksend`](packages/n8n-nodes-daksend) package with both regular actions and a webhook trigger
- **Outgoing webhooks** — HMAC-signed event delivery on `subscribe`, `unsubscribe`, `open`, `click`, `bounce`, `complaint`
- **Incoming SES webhooks** — production-grade SNS signature verification and bounce/complaint processing

### Administration & security
- **First-run signup** — the first user to visit `/signup` automatically becomes admin; subsequent signups are blocked
- **Role-based access** — admin and standard user roles with brand-level permissions
- **User management** — admins can create, delete, and assign users to brands from the Settings UI
- **Profile editing** — any user can update their name and email address (password confirmation required; email changes sign you out)
- **Two-factor authentication (TOTP)** — per-user 2FA with Google Authenticator / Authy support, 8 recovery codes, and one-click regeneration
- **2FA policy enforcement** — admin can set 2FA to disabled, optional, or required for all users
- **Login brute-force protection** — in-memory rate limiter blocks an IP after 5 failed attempts for 15 minutes
- **Per-brand SES credentials** — override global AWS keys on a per-brand basis via the Settings UI
- **Audit-friendly** — all business logic lives in auditable server actions, not client code

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router, React Server Components) |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Email | Amazon SES v2 |
| Auth | NextAuth.js (Credentials provider, JWT sessions) |
| 2FA | otplib (TOTP) + qrcode |
| Email rendering | cheerio (DOM), juice (CSS inliner), html-to-text |
| UI | Tailwind CSS v4, Radix UI, shadcn/ui, Lucide Icons |
| Editor | TipTap v3 (rich text) + CodeMirror 6 (HTML source) + custom block builder (@dnd-kit) |
| Deployment | PM2 (`ecosystem.config.js`) or Vercel + separate worker host |

---

## Architecture

```
User action (UI)
  └─► Server action  ─►  Prisma (PostgreSQL)
                     ─►  BullMQ queue (Redis)
                             └─► Worker process  ─►  renderEmail() pipeline
                                                         ├─ Personalization
                                                         ├─ HTML wrapper (DOCTYPE/MSO)
                                                         ├─ CSS inlining (juice)
                                                         ├─ Tracking pixel + click rewrites
                                                         └─ Plain-text generation
                                                 ─►  AWS SES (multipart/alternative)
                                                 ─►  Warmup counter
                                                 ─►  Outgoing webhook dispatch

External events
  └─► SES/SNS  ─►  /api/webhooks/ses  ─►  Bounce/complaint suppression
  └─► Cron     ─►  /api/cron/*         ─►  Scheduled campaigns, RSS polling, automations
```

The worker process (`npm run worker`) is **required** alongside the web server — it drains the BullMQ queue, handles rendering, and sends through SES. Without it, queued emails will sit idle.

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
DIRECT_URL="postgresql://user:password@localhost:5432/daksend"

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

### 4. Migrate the database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Run the app

Two processes are required — run each in its own terminal:

```bash
npm run dev        # Next.js web server on :3000
npm run worker     # BullMQ email worker
```

Open [http://localhost:3000/signup](http://localhost:3000/signup) to create your admin account. Subsequent visits to `/signup` are blocked once a user exists.

---

## Cron Jobs

Three cron endpoints drive the time-based features. All require a `?secret=` query parameter matching `CRON_SECRET`.

| Endpoint | Purpose | Recommended Interval |
|----------|---------|----------------------|
| `GET /api/cron/scheduled` | Dispatch campaigns whose `scheduledAt` has passed | Every 1 minute |
| `GET /api/cron/rss` | Poll RSS feeds and draft new campaigns | Every 15–60 min; once daily for digest feeds |
| `GET /api/cron/automations` | Advance subscribers through automation steps | Every 1–5 minutes |
| `GET /api/cron/retention` | Purge old bounced/unsubscribed subscribers and campaign analytics per GDPR data retention policy | Once daily |

The retention cron uses thresholds configurable in the `Setting` table:

| Key | Default | Effect |
|-----|---------|--------|
| `RETENTION_BOUNCED_DAYS` | 90 | Delete bounced subscribers older than N days |
| `RETENTION_UNSUBSCRIBED_DAYS` | 365 | Delete unsubscribed subscribers older than N days |
| `RETENTION_CAMPAIGN_SENDS_DAYS` | 730 | Delete `CampaignSend` records older than N days |
| `RETENTION_CAMPAIGN_CLICKS_DAYS` | 730 | Delete `CampaignClick` records older than N days |

Set any threshold to `0` to disable that purge. Each run is logged to the `AuditLog` table.

**crontab example:**

```bash
* * * * * curl -fsS "https://your-domain.com/api/cron/scheduled?secret=YOUR_CRON_SECRET"
*/2 * * * * curl -fsS "https://your-domain.com/api/cron/automations?secret=YOUR_CRON_SECRET"
*/30 * * * * curl -fsS "https://your-domain.com/api/cron/rss?secret=YOUR_CRON_SECRET"
0 3 * * * curl -fsS "https://your-domain.com/api/cron/retention?secret=YOUR_CRON_SECRET"
```

**Vercel `vercel.json`:**

```json
{
  "crons": [
    { "path": "/api/cron/scheduled?secret=YOUR_CRON_SECRET", "schedule": "* * * * *" },
    { "path": "/api/cron/automations?secret=YOUR_CRON_SECRET", "schedule": "*/2 * * * *" },
    { "path": "/api/cron/rss?secret=YOUR_CRON_SECRET", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/retention?secret=YOUR_CRON_SECRET", "schedule": "0 3 * * *" }
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

Generate or rotate your API key via **Dashboard → Settings → Transactional API Key**. Keys are stored as bcrypt hashes; the plaintext is shown once upon generation. Legacy plaintext keys already in the `Setting` table continue to work until rotated.

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

### SES bounce / complaint handler

Point your SES → SNS topic at:

```
POST https://your-domain.com/api/webhooks/ses
```

SNS signature verification is enforced. Hard bounces mark the subscriber globally and add a global suppression entry; complaints are scoped to the originating brand via the `campaign_id` email tag and add a brand-scoped suppression entry. Both are visible in the Deliverability dashboard.

---

## REST API v1

A full REST API for external integrations lives under `/api/v1`. Authenticate with `x-api-key: YOUR_API_KEY`.

| Resource | Endpoints |
|----------|-----------|
| Brands | `GET /api/v1/brands` |
| Lists | `GET /api/v1/lists` |
| Subscribers | `GET /api/v1/subscribers`, `POST /api/v1/subscribers`, `GET /api/v1/subscribers/:email`, `PATCH /api/v1/subscribers/:email`, `DELETE /api/v1/subscribers/:email` |
| Subscriber Tags | `GET /api/v1/subscribers/:email/tags`, `POST /api/v1/subscribers/:email/tags`, `DELETE /api/v1/subscribers/:email/tags` |
| Events | `POST /api/v1/events` — track a named event against a subscriber; triggers event-based automations |
| Tags | `GET /api/v1/tags`, `POST /api/v1/tags`, `DELETE /api/v1/tags` |
| Campaigns | `GET /api/v1/campaigns`, `GET /api/v1/campaigns/:id` |
| Automations | `POST /api/v1/automations/:id/enroll` — enroll a subscriber by email into an API-triggered automation |
| Webhooks | `GET /api/v1/webhooks`, `POST /api/v1/webhooks`, `GET /api/v1/webhooks/:id`, `PATCH /api/v1/webhooks/:id`, `DELETE /api/v1/webhooks/:id` |

#### Automation enrollment via API

```bash
curl -X POST https://your-domain.com/api/v1/automations/AUTOMATION_ID/enroll \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "Jane"}'
```

The automation must have its trigger set to **API Trigger** and be in **Active** status.

#### Automation enrollment via Inbound Webhook

Each Webhook-triggered automation has a unique URL and Bearer token visible on its builder page:

```bash
curl -X POST https://your-domain.com/api/automations/AUTOMATION_ID/trigger \
  -H "Authorization: Bearer AUTOMATION_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "Jane"}'
```

#### Track a subscriber event

Fire a named event against a subscriber to trigger event-based automations and feed segment rules:

```bash
curl -X POST https://your-domain.com/api/v1/events \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "listId": "your-list-id",
    "event": "purchase",
    "properties": { "plan": "pro", "amount": 99 }
  }'
```

Any automation with trigger type **Event Trigger** and matching event name will automatically enroll the subscriber.

#### Manage subscriber tags

```bash
# Add a tag (by name — created automatically if it doesn't exist)
curl -X POST https://your-domain.com/api/v1/subscribers/user@example.com/tags \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tagName": "vip", "listId": "your-list-id"}'

# List tags on a subscriber
curl https://your-domain.com/api/v1/subscribers/user@example.com/tags?listId=your-list-id \
  -H "x-api-key: YOUR_API_KEY"
```

---

## n8n Integration

A first-party n8n community node lives at [`packages/n8n-nodes-daksend`](packages/n8n-nodes-daksend).

- **DakSend** — action node for subscriber CRUD, campaign lookups, and transactional sends
- **DakSend Trigger** — webhook trigger that fires on `subscribe`, `unsubscribe`, `open`, `click`, `bounce`, or `complaint` events

```bash
cd packages/n8n-nodes-daksend
npm install && npm run build
```

---

## Deployment

### PM2 (self-hosted VPS or Raspberry Pi)

```bash
npm run build
pm2 start ecosystem.config.js
```

`ecosystem.config.js` runs both the web server and the worker under PM2 supervision with auto-restart.

### Vercel + separate worker

- Deploy the web app to Vercel as usual
- **Run the worker separately** — Vercel functions are short-lived and cannot host BullMQ. Use Railway, Fly.io, or any Node host for `npm run worker`
- Configure cron endpoints via `vercel.json`
- Use Neon/Supabase/RDS for Postgres and Upstash/Redis Cloud for Redis

### Production checklist

- [ ] `DATABASE_URL` + `DIRECT_URL` set (use a separate `DIRECT_URL` for migrations when behind a pooler like PgBouncer)
- [ ] Redis reachable from both web and worker processes
- [ ] `NEXTAUTH_SECRET` and `CRON_SECRET` set to strong random values (`openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain (embedded in all tracking + unsubscribe links)
- [ ] SES sender domain verified with SPF, DKIM, and DMARC records
- [ ] SES production access requested (out of sandbox)
- [ ] Worker process running (`pm2 ls`)
- [ ] Cron endpoints scheduled (including `/api/cron/retention` for data retention)
- [ ] SNS topic pointing to `/api/webhooks/ses` for bounce/complaint processing

---

## Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── actions/          # Server actions — all business logic
│   │   ├── api/
│   │   │   ├── v1/           # REST API v1
│   │   │   ├── cron/         # Time-based dispatchers
│   │   │   ├── webhooks/     # Incoming SES/SNS handlers
│   │   │   ├── send/         # Transactional email API
│   │   │   └── subscribe/    # Public signup API
│   │   ├── dashboard/        # Authenticated dashboard pages (incl. Deliverability, Tags)
│   │   ├── login/            # Auth pages
│   │   ├── signup/           # First-run admin signup
│   │   └── f/[slug]/         # Public landing page forms
│   ├── components/           # React components (shadcn/ui + custom)
│   └── lib/
│       ├── prisma.ts         # Prisma client singleton
│       ├── queue.ts          # BullMQ producer
│       ├── worker.ts         # BullMQ consumer
│       ├── email-render.ts   # renderEmail() pipeline
│       ├── email-boilerplate.ts  # Outlook-safe HTML wrapper
│       ├── totp.ts           # TOTP / 2FA helpers
│       ├── rate-limit.ts     # In-memory login brute-force protection
│       ├── warmup.ts         # Domain warmup enforcement
│       ├── segment-query.ts  # Segment rule evaluator (supports tags + events)
│       ├── blocks-to-html.ts # Block-based email compiler (JSON → table HTML)
│       └── webhooks.ts       # Outgoing webhook dispatcher
├── prisma/schema.prisma
├── public/
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
npx prisma migrate dev      # Create + apply a new migration (dev only)
npx prisma migrate deploy   # Apply pending migrations (production)
npx prisma db push          # Sync schema without migration history (quick)
npx prisma generate         # Regenerate client after schema changes
npx prisma studio           # Open Prisma GUI

# Code quality
npm run lint         # Run ESLint
```

---

## Security

- All dashboard routes are protected by NextAuth JWT sessions
- TOTP-based two-factor authentication with recovery codes
- Login brute-force protection: 5 failures per IP → 15-minute lockout
- Public API endpoints are Redis-rate-limited per IP
- Outgoing webhook URLs are validated against SSRF attacks
- Incoming SNS notifications are verified against AWS's public certificate chain
- Outgoing webhook payloads are signed with HMAC-SHA256
- Transactional and REST API keys are stored as **bcrypt hashes** (cost 12); plaintext is shown once at generation time and never stored
- Cron endpoints require a shared secret query parameter

### GDPR

- Subscriber consent is recorded with timestamp, source (`form` / `confirm` / `api` / `import`), and IP address
- Hard delete (right to erasure) cascades all subscriber data
- CSV export for data portability; all exports are logged
- Immutable `AuditLog` table records consent events, exports, deletions, and API key rotations
- Per-campaign open/click tracking toggles — disable either at send time
- Data retention cron (`/api/cron/retention`) automatically purges bounced/unsubscribed subscribers and old analytics records on configurable schedules
- AWS region is operator-configurable, allowing EU-resident deployments for data residency

---

## Q&A Setup Guide

### AWS SES

**Q: How do I get started with AWS SES?**

1. Sign in to the [AWS Console](https://console.aws.amazon.com/ses)
2. Choose your region (pick one close to your audience — `us-east-1`, `eu-west-1`, `ap-south-1`, etc.)
3. Go to **Verified identities → Create identity**
4. Verify either a full domain (recommended) or a single email address
5. For domain verification, AWS gives you DNS records to add in your domain registrar (usually a CNAME for DKIM and a TXT for domain ownership)
6. Create an IAM user with the `AmazonSESFullAccess` policy, generate access keys, and paste them into your `.env` or the DakSend Settings page

**Q: What DNS records do I need for good deliverability?**

All three records are required to pass spam filters and avoid landing in junk:

| Record | Type | Purpose |
|--------|------|---------|
| SPF | TXT at `@` | Tells receiving servers which IPs can send on your behalf |
| DKIM | CNAME (×3) | Cryptographically signs your emails — AWS provides the records |
| DMARC | TXT at `_dmarc` | Policy for what to do with failing mail; enables Postmaster reporting |

**SPF** (add to your root domain `@`):
```
v=spf1 include:amazonses.com ~all
```

**DMARC** (add at `_dmarc.yourdomain.com`):
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com
```
Start with `p=none` (monitor only), then move to `p=quarantine` and eventually `p=reject` once you confirm all your sending sources pass.

**DKIM**: AWS SES generates three CNAME records for you automatically when you verify a domain. Just add all three to your DNS.

**Q: SES is in sandbox mode — what does that mean?**

In sandbox, you can only send to verified email addresses and you have a low daily sending limit. To send to real subscribers you must request production access:

1. Go to **SES Console → Account Dashboard**
2. Click **Request production access**
3. Fill in the form explaining your use case, list management practices, and expected sending volume
4. AWS typically approves within 24 hours

**Q: How do I increase my SES sending rate / daily limit?**

AWS starts you with 50,000 emails/day and 14 emails/second after production access. To increase:

1. Go to **SES Console → Account Dashboard → Edit**
2. Click **Request increase** under your current quota
3. Submit a support ticket explaining your expected volume and list hygiene practices

DakSend's worker has a `SEND_RATE` constant (default: 14/second) that you should tune to match your approved rate — find it in `src/lib/worker.ts`.

**Q: How do I set up bounce and complaint handling?**

This is critical — high bounce or complaint rates will get your SES account suspended.

1. In the SES Console, go to **Configuration sets → Create configuration set**
2. Under **Event destinations**, add an SNS destination for `Bounce` and `Complaint` events
3. Create an SNS topic and add `https://your-domain.com/api/webhooks/ses` as a subscription
4. Confirm the subscription (AWS will send a confirmation request to your endpoint)
5. DakSend automatically verifies SNS signatures and suppresses bounced/complained addresses

**Q: What's the difference between `AWS_ACCESS_KEY_ID` in `.env` vs the Settings UI?**

- **`.env`** — global fallback, used by all brands that don't have their own credentials
- **Settings UI** (Dashboard → Settings → AWS Configuration) — per-instance override stored in the database, takes precedence over `.env`
- **Per-brand credentials** — go to a Brand's settings; paste brand-specific keys there if you manage multiple SES identities under different AWS accounts

---

### Sending & Deliverability

**Q: Why are my emails landing in spam?**

Check these in order:

1. **SPF, DKIM, DMARC** — use [MXToolbox](https://mxtoolbox.com) or the built-in Deliverability checker (Settings → Email Deliverability) to confirm all three pass
2. **Plain-text alternative** — DakSend automatically includes a plain-text part now, but if you're using an old campaign that somehow bypasses the pipeline, re-send it
3. **List-Unsubscribe headers** — DakSend adds these automatically for all bulk sends; verify by viewing the raw headers in Gmail (⋮ → Show original)
4. **List hygiene** — remove hard bounces and complaints immediately (DakSend does this automatically via SES webhooks). A complaint rate above 0.1% will start triggering Gmail's spam filter
5. **Domain warmup** — if your sending domain is new, use the Domain Warmup feature (Settings → Domain Warmup) to ramp up volume gradually
6. **Content** — avoid spam trigger words, misleading subjects, and all-image emails with no text

**Q: Emails look broken in Outlook but fine in Gmail — why?**

Outlook uses the Microsoft Word HTML rendering engine, which ignores most CSS selectors and `<style>` blocks. DakSend's rendering pipeline (`src/lib/email-render.ts`) handles this automatically:

- Wraps all outgoing HTML in a proper `<!DOCTYPE html>` document with MSO VML namespace and conditional comments
- Inlines all CSS using `juice` so every style is on the element itself
- Includes MSO-specific `table-lspace`/`table-rspace` resets

If you paste raw HTML that uses modern CSS (Flexbox, Grid, CSS variables), Outlook will still struggle — use table-based layouts for maximum compatibility.

**Q: How do I test my email deliverability score before sending?**

Use [mail-tester.com](https://www.mail-tester.com):

1. Create a test list with one subscriber pointing to the temporary address mail-tester.com gives you
2. Send a real campaign to that list
3. Check your score — aim for 9/10 or higher

Common deductions: missing plain-text part, no `List-Unsubscribe` header, hidden tracking pixel. DakSend now handles all three automatically.

**Q: What personalization tags can I use in campaigns?**

| Tag | Replaced with |
|-----|--------------|
| `[Name]` | Subscriber's name (or blank if empty) |
| `[Email]` | Subscriber's email address |
| `[UnsubscribeUrl]` | Full unsubscribe URL for this subscriber |
| `[Unsubscribe]` | Same as above (alias) |
| `[CustomField:FieldName]` | Value of the custom field named `FieldName` |

Tags work in subject lines, HTML bodies, and plain-text bodies.

---

### Self-hosting on a Raspberry Pi (or any Linux VPS)

**Q: Can I run DakSend on a Raspberry Pi?**

Yes. DakSend runs well on a Raspberry Pi 4 (4GB recommended). Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) to expose it publicly without opening ports on your router.

```bash
# Install Node.js (use nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20 && nvm use 20

# Install Postgres and Redis
sudo apt install -y postgresql redis-server

# Clone and install DakSend
git clone https://github.com/your-org/dak-send.git
cd dak-send
npm install
npx prisma generate      # Required on ARM — regenerates the platform-specific binary
npx prisma db push

# Build and start
npm run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

**Q: After pulling new code on the Pi, builds fail with "property does not exist" TypeScript errors.**

Run `npx prisma generate` after every `git pull` that includes schema changes. The Prisma client contains platform-specific native binaries and must be regenerated for the ARM architecture after updates.

```bash
git pull
npm install
npx prisma generate
npm run build
pm2 restart all
```

**Q: How do I expose my Pi to the internet securely?**

Use Cloudflare Tunnel — no port forwarding, no exposed IP, free:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
sudo mv cloudflared /usr/local/bin/ && sudo chmod +x /usr/local/bin/cloudflared

# Authenticate and create a tunnel
cloudflared tunnel login
cloudflared tunnel create daksend

# Create config at ~/.cloudflared/config.yml
cat > ~/.cloudflared/config.yml << EOF
tunnel: <your-tunnel-id>
credentials-file: /home/pi/.cloudflared/<your-tunnel-id>.json
ingress:
  - hostname: daksend.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Add a CNAME in Cloudflare DNS:
# daksend.yourdomain.com  →  <tunnel-id>.cfargotunnel.com

# Run as a system service
sudo cloudflared service install
sudo systemctl start cloudflared
```

**Q: What firewall rules should I use on the Pi?**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
# Restrict web server to loopback — Cloudflare Tunnel connects locally
sudo ufw allow from 127.0.0.1 to any port 3000
# Allow VNC only from your local network
sudo ufw allow from 10.0.0.0/24 to any port 5900
# Allow Jellyfin only from your local network (if running)
sudo ufw allow from 10.0.0.0/24 to any port 8096
sudo ufw enable
```

---

### Database

**Q: Will running `prisma migrate deploy` on the Pi delete my data?**

No. `migrate deploy` applies pending migrations to your existing database without touching data. It only adds new tables or columns defined in the migration files. `prisma db push` similarly syncs the schema without data loss (unless you explicitly drop columns).

**Q: I'm using Neon / Supabase — what's `DIRECT_URL` for?**

Neon and Supabase use a connection pooler by default. Prisma needs a direct (non-pooled) connection to run migrations. Set `DATABASE_URL` to the pooled URL (for runtime) and `DIRECT_URL` to the direct URL (for migrations):

```env
DATABASE_URL="postgresql://user:password@pooler.neon.tech:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech:5432/db"
```

---

### Authentication

**Q: How do I create the first admin account?**

Visit `https://your-domain.com/signup` before anyone else does. The first user to sign up is automatically made admin. After that, `/signup` is disabled — new users must be created by an admin via Settings → User Management.

**Q: How do I set up two-factor authentication?**

1. Go to **Dashboard → Settings → Your Profile → Two-Factor Authentication**
2. Click **Set Up 2FA**
3. Scan the QR code with Google Authenticator, Authy, or any TOTP app
4. Enter the 6-digit code to confirm setup
5. Save the 8 recovery codes somewhere safe — they're shown only once

From the next login onwards, you'll be prompted for a TOTP code after your password.

**Q: I lost my authenticator app. How do I log in?**

Use one of your recovery codes at the 2FA prompt instead of a 6-digit code. Each code can only be used once.

If you've lost both your authenticator and your recovery codes, an admin can disable 2FA for your account directly in the database:

```sql
UPDATE "User" SET "totpEnabled" = false, "totpSecret" = null, "recoveryCodes" = '{}' WHERE email = 'your@email.com';
```

**Q: Can I force all users to use 2FA?**

Yes. Go to **Dashboard → Settings → Two-Factor Authentication Policy** and set it to **Required**. Users who haven't configured 2FA will still be able to log in but will see a prompt to set it up.

---

### Redis & Queue

**Q: Campaigns are stuck in "Sending" and never complete.**

The worker process is not running. In a separate terminal (or PM2 process):

```bash
npm run worker
# or
pm2 start ecosystem.config.js
```

**Q: I'm using Upstash Redis and the worker can't connect.**

Upstash requires TLS. Make sure your `REDIS_URL` uses `rediss://` (double `s`) not `redis://`:

```env
REDIS_URL="rediss://default:your-token@your-instance.upstash.io:6379"
```

---

## RSS Digest for Drupal (or any CMS)

A common use case: you publish sermon or article pages on a CMS and want to automatically email subscribers a daily digest of everything new. Here is the end-to-end setup.

### Architecture

```
Drupal (or any CMS)
  ├── RSS feed at /sermons/feed         ← Drupal generates this automatically
  ├── DakSend embed form                ← paste snippet into a block or page
  └── (no other code needed on site)

DakSend
  ├── List: "Sermon Daily Digest"
  ├── RSS Feed (Digest Mode enabled)
  └── Daily cron → polls RSS → batches all new items → one draft campaign
```

### Step 1 — Create a subscriber list

Dashboard → your brand → **New List** → name it "Sermon Daily Digest".

### Step 2 — Embed a signup form on your site

Dashboard → Lists → open the list → **Embed Form** → copy the HTML snippet → paste it into a Drupal block (Structure → Block layout → Add custom block) or directly into a page template.

### Step 3 — Expose an RSS feed from Drupal

Drupal 8/9/10 generates RSS feeds out of the box:

- **Site-wide feed**: `/rss.xml`
- **Per content-type feed via Views**: Structure → Views → find your "Sermons" view (or create one), add an **RSS Feed** display filtered to your Sermon content type, save. The feed URL will be something like `/sermons/feed`.

If you use the [Views module](https://www.drupal.org/project/views) (bundled in Drupal 8+) you can also control which fields appear in the feed (title, body, image URL in the enclosure) from the View's RSS settings.

### Step 4 — Add the RSS feed in DakSend

Dashboard → **RSS Feeds** → **Add RSS Feed**:

| Field | Value |
|-------|-------|
| Feed Name | `Sermon Daily Digest` |
| RSS Feed URL | `https://yoursite.com/sermons/feed` |
| Brand | your brand |
| Target Lists | Sermon Daily Digest |
| **Daily Digest Mode** | **enabled** |
| Digest Subject | `New Sermons Added — [RssDate]` (or customize) |
| Item Block Template | leave blank for the default card, or paste custom HTML |
| Digest Email Wrapper | leave blank for the default wrapper, or paste a fully branded HTML email |

### Step 5 — Schedule the cron (once per day)

```bash
# Fire at 8 AM UTC every day
0 8 * * *   curl -fsS "https://your-daksend-url.com/api/cron/rss?secret=YOUR_CRON_SECRET"
```

Every time this runs, DakSend:
1. Fetches your RSS feed
2. Collects all items published since the last run
3. If any new items exist, renders them into a single digest email and creates a campaign **draft**
4. The draft appears in the Campaigns list ready to review and send (or schedule)

### Step 6 — Auto-send (optional)

By default, digest campaigns land as drafts so you can review before they go out. To send automatically, schedule the campaign in DakSend after it's created, or combine with the scheduled campaign cron.

### Digest template tags

**In the Item Block template** (renders once per new item):

| Tag | Replaced with |
|-----|--------------|
| `[RssTitle]` | Sermon / article title |
| `[RssLink]` | URL of the page |
| `[RssContent]` | Short excerpt (200 characters, HTML stripped) |
| `[RssAuthor]` | Author / preacher name |
| `[RssDate]` | Publication date (formatted, e.g. "April 13, 2026") |
| `[RssThumbnail]` | Thumbnail image URL (from RSS `<enclosure>` if present) |

**In the Digest Wrapper and Subject** (renders once per digest email):

| Tag | Replaced with |
|-----|--------------|
| `[RssItems]` | All rendered item blocks concatenated |
| `[RssDate]` | Today's date |
| `[RssCount]` | Number of new items in this digest |
| `[RssFeedName]` | Feed name as set in DakSend |
| `[Unsubscribe]` | Unsubscribe link |

---

### Q&A — RSS Digest

**Q: I added the feed but no campaign was created when the cron ran.**

- Check that the feed is set to **Active** (green badge on the RSS Feeds page)
- Confirm the Drupal RSS URL is publicly accessible without authentication: `curl https://yoursite.com/sermons/feed`
- Make sure there is at least one item in the feed that is **newer** than the last time the cron ran. On the first run, DakSend records the newest item as the baseline — the very next run will only include items published after that point. To force a first digest, temporarily clear `lastItemGuid` in the database for that feed row, then run the cron again

**Q: How do I include a sermon thumbnail image in the digest email?**

Drupal can add an image to the RSS enclosure field. In your Sermon View's RSS display, add the image field and set the "Style" to use it as the enclosure (`<enclosure url="..." />`). Then in your Item Block template, add an `<img>` using `[RssThumbnail]`:

```html
<div style="border-bottom:1px solid #e5e7eb;padding:24px 0;display:flex;gap:16px;">
  <img src="[RssThumbnail]" width="80" height="80" style="border-radius:8px;object-fit:cover;flex-shrink:0;" alt="" />
  <div>
    <h3 style="margin:0 0 6px;"><a href="[RssLink]">[RssTitle]</a></h3>
    <p style="margin:0;color:#6b7280;font-size:14px;">[RssAuthor] — [RssDate]</p>
  </div>
</div>
```

**Q: Can I send the digest automatically without reviewing the draft?**

Set the campaign's send time to a fixed daily slot. Alternatively, you can extend the RSS cron action to immediately schedule or send campaigns it creates — this would require a small code change in `src/app/actions/rss.ts` (`checkRssFeeds`), changing `status: "draft"` to `status: "sending"` and queuing the send.

**Q: The digest is sending one email per sermon instead of one per day.**

Digest Mode was not enabled when the feed was created. Edit the feed (pencil icon on the RSS Feeds page) and toggle **Daily Digest Mode** on. Also make sure your cron only runs once per day — if it runs every 15 minutes and finds new items each time, it creates multiple digest campaigns.

**Q: How do I use this for a non-Drupal site?**

Any CMS or framework that produces a valid RSS 2.0 or Atom feed works identically. Examples:

| Platform | Default feed URL |
|----------|-----------------|
| WordPress | `/feed` or `/feed/rss2` |
| Ghost | `/rss` |
| Webflow (Blog) | `/blog/rss.xml` |
| Jekyll | `/feed.xml` |
| Custom Next.js | Create a `/api/rss` route that returns valid RSS XML |

---

## License

MIT
