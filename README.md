# DakSend

A self-hosted email newsletter platform built with Next.js, Prisma, and Amazon SES. Manage brands, subscriber lists, campaigns, and more—all from a clean, modern dashboard.

## Features

- **Automation / Drip Campaigns** — Build visual workflows with delays, conditional splits, and email steps
- **Landing Pages & Forms** — Visual builder with public, customizable `/f/[slug]` pages and embeddable widgets
- **Template Library** — Create, save, and reuse custom email templates across campaigns and automations
- **Webhooks (Outgoing)** — Send real-time HTTP POST payloads (HMAC signed) to Zapier, Make, etc. on subscribe, open, click, or unsubscribe events
- **Send Time Optimization** — Automatically track each subscriber's historically most engaged hour to delay campaign delivery until their optimal time
- **Email Previews** — In-app multi-client rendering simulation (Gmail, Outlook, Apple Mail)
- **Multi-brand support** — Manage multiple sender identities with per-brand configuration
- **Subscriber management** — Import/export CSV, custom fields, GDPR consent, double opt-in
- **Campaign builder** — Rich text + raw HTML editor, 6 pre-built templates, test sends
- **Segmentation** — Rule-based segments and engagement-based auto-segmentation
- **Open & click tracking** — Tracking pixel + redirect proxy with real-time analytics
- **A/B testing** — Split-test subject lines and content, pick winners from live results
- **RSS-to-email** — Auto-generate campaigns from RSS feed items
- **Scheduled sending** — Set a future send date; a cron job dispatches when it's due
- **Domain warmup** — 14-day ramp-up schedule to build sender reputation
- **Deliverability monitoring** — SPF, DKIM, DMARC, and MX record checks
- **Transactional email API** — Send one-off emails (receipts, notifications) via API key
- **Subscriber preference center** — Public page for subscribers to manage their list subscriptions
- **Webhook handlers (Incoming)** — SES bounce/complaint processing with SNS signature verification
- **Role-based access** — Admin and standard user roles with brand-level permissions

---

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** database
- **Redis** server (for the BullMQ email queue)
- **Amazon SES** account (for sending emails)

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/dak-send.git
cd dak-send
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/daksend"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# App URL (used for tracking links, unsubscribe URLs, confirmation emails)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Redis (for email queue)
REDIS_URL="redis://localhost:6379"

# AWS SES (can also be configured via the Settings UI)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Cron endpoint security
CRON_SECRET="your-cron-secret"
```

> **Note:** AWS credentials can also be set from the Settings page in the dashboard. Environment variables serve as fallback defaults.

### 3. Set up the database

```bash
npx prisma migrate deploy
npx prisma generate
```

To seed an initial admin user, run:

```bash
npx prisma db seed
```

Or create one manually via Prisma Studio:

```bash
npx prisma studio
```

### 4. Start the app

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 5. Start the email worker

The worker processes the email queue in the background. Run it in a separate terminal:

```bash
npm run worker
```

---

## Cron Jobs

Two cron endpoints are available for automated tasks. Secure them with `CRON_SECRET`:

| Endpoint | Purpose | Recommended Interval |
|----------|---------|---------------------|
| `GET /api/cron/scheduled?secret=YOUR_SECRET` | Dispatches campaigns that have reached their scheduled send time | Every 1 minute |
| `GET /api/cron/rss?secret=YOUR_SECRET` | Polls RSS feeds and creates campaign drafts from new items | Every 15–60 minutes |

**Example crontab:**

```bash
# Check for due scheduled campaigns every minute
* * * * * curl -s "https://your-domain.com/api/cron/scheduled?secret=YOUR_CRON_SECRET"

# Poll RSS feeds every 30 minutes
*/30 * * * * curl -s "https://your-domain.com/api/cron/rss?secret=YOUR_CRON_SECRET"
```

**On Vercel**, add these to your `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/scheduled?secret=YOUR_CRON_SECRET", "schedule": "* * * * *" },
    { "path": "/api/cron/rss?secret=YOUR_CRON_SECRET", "schedule": "*/30 * * * *" }
  ]
}
```

---

## API Endpoints

### Transactional Email API

Send one-off emails (receipts, notifications, etc.) via a simple REST call:

```bash
curl -X POST https://your-domain.com/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "to": "user@example.com",
    "subject": "Your receipt",
    "html": "<h1>Thank you!</h1><p>Your order is confirmed.</p>",
    "from": "receipts@yourdomain.com"
  }'
```

Set the API key in the database `Setting` table with key `API_KEY`.

### Subscribe API

Add subscribers to a list programmatically:

```bash
curl -X POST https://your-domain.com/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "subscriber@example.com",
    "name": "Jane Doe",
    "listId": "your-list-id"
  }'
```

### SES Webhooks

Point your AWS SES SNS notifications to:

```
POST https://your-domain.com/api/webhooks/ses
```

This handles bounce and complaint notifications, automatically updating subscriber statuses. SNS signature verification is enforced in production.

---

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (send, rss, warmup, ab-test, etc.)
│   ├── api/              # API routes (subscribe, export, cron, webhooks, etc.)
│   └── dashboard/        # Dashboard pages (brands, lists, campaigns, settings)
├── components/           # React components (forms, buttons, cards)
├── lib/                  # Shared utilities (prisma, auth, aws, queue, worker)
prisma/
├── schema.prisma         # Database schema
└── migrations/           # Migration history
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Email | Amazon SES |
| Auth | NextAuth.js (credentials provider) |
| UI | Tailwind CSS, Radix UI, Lucide Icons |
| Editor | TipTap (rich text) + CodeMirror (HTML source) |

---

## License

MIT
