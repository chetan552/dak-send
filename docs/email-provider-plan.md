# Email Provider Abstraction — Design Plan

Reframe DakSend as a campaign platform that plugs into any email sender via a user-supplied API key. DakSend owns lists, segments, campaigns, automations, tracking, and analytics; the user brings transport.

## Positioning

- **Recommended default:** Resend. One-click signup, single API key, domain verification in Resend's own UI — no DNS juggling inside DakSend.
- **Also supported:** Postmark (broadcast stream), AWS SES, Azure Communication Services.
- **What DakSend stops owning:** AWS credential UX, SNS webhook plumbing as a first-class concern, the "self-hosted SES frontend" framing.
- **What DakSend keeps owning:** subscribers, lists, segments, custom fields, campaigns, automations, signup forms, RSS-to-email, A/B tests, open/click tracking, analytics, suppression list.

## Provider Interface

New file: `src/lib/email-provider/types.ts`

```ts
export interface EmailProvider {
  send(msg: EmailMessage): Promise<{ messageId: string }>;
  getQuota?(): Promise<QuotaInfo>;                    // optional; dashboard feature
  verifyWebhook(req: WebhookRequest): Promise<boolean>;
  parseWebhook(body: unknown): BounceEvent | ComplaintEvent | null;
}

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags: Record<string, string>;                       // campaign_id, etc.
}
```

Implementations: `resend-provider.ts`, `postmark-provider.ts`, `ses-provider.ts`, `acs-provider.ts`. A factory `getProvider(brandId)` reads the brand's `EMAIL_PROVIDER` setting and returns the right instance.

## Current SES Integration Surface

| Component | File | Lines | Role |
|-----------|------|-------|------|
| SES client | `src/lib/aws.ts` | 4-35 | Instantiation + `SendEmailCommand` wrapper |
| Worker send | `src/lib/worker.ts` | 81, 162 | Campaign/automation send execution |
| Settings store | `src/app/actions/settings.ts` | 14-88 | Credential & quota management |
| Config UI | `src/components/settings/aws-config-form.tsx` | 15-135 | AWS credential input form |
| Webhooks | `src/app/api/webhooks/ses/route.ts` | 1-222 | SNS bounce/complaint processing |
| Tracking | `src/lib/email-render.ts` | 78-174 | Provider-agnostic pixel/click injection |
| Warmup | `src/app/actions/warmup.ts`, `src/lib/warmup.ts` | 55-93, 13-57 | Rate-limiting scheduler |

Settings uses a key-value `Setting` table (`prisma/schema.prisma:174-177`), so provider-specific credentials can be added without schema migration.

## What Stays Shared

- `src/lib/email-render.ts` — tracking pixel + click rewriting stay in DakSend so analytics remain the source of truth
- `src/lib/warmup.ts` — pure rate-limiting, no provider calls
- `SEND_RATE` BullMQ limiter — applies to job processing
- The queue/worker shell

## What Changes

1. **`src/lib/aws.ts`** becomes `src/lib/email-provider/ses-provider.ts` implementing the interface. Callers go through the factory instead of calling `sendEmail()` directly.
2. **`src/lib/worker.ts:81,162`** — replace direct `sendEmail()` with `provider.send(msg)` after resolving provider per job.
3. **`Setting` model** — add keys: `EMAIL_PROVIDER` (`"resend" | "postmark" | "ses" | "acs"`), plus provider-specific keys (`RESEND_API_KEY`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_MESSAGE_STREAM`, existing `AWS_*`, `ACS_CONNECTION_STRING`, `ACS_SENDER_DOMAIN`). No schema migration needed.
4. **Webhooks** — one route per provider (`/api/webhooks/resend`, `/api/webhooks/postmark`, existing `/api/webhooks/ses`, new `/api/webhooks/acs`). Extract bounce/complaint DB logic into `src/lib/email-provider/handle-event.ts` so all routes reuse it.
5. **Settings UI** — provider picker at the top, then provider-specific credential form. Rename `aws-config-form.tsx` to `email-provider-form.tsx` with sub-forms per provider.
6. **Disable provider-side tracking** — when sending via Resend/Postmark, pass the flags that turn off their open/click tracking so DakSend's pixel and link rewriter remain the single source of truth.
7. **Onboarding copy** — README and first-run settings page lead with Resend; SES/ACS moved to an "advanced" section.

## Migration Path (3 PRs)

- **PR 1 — Refactor, no behavior change.** Introduce `EmailProvider` interface + SES implementation behind the factory. All existing code paths go through the new abstraction. `EMAIL_PROVIDER` setting defaults to `"ses"` so current users are unaffected.
- **PR 2 — Add Resend + Postmark.** Implementations, webhook routes, settings forms. Reposition first-run experience around Resend.
- **PR 3 — Add ACS + per-brand selection.** ACS implementation; move `EMAIL_PROVIDER` from global to brand-scoped so different brands can use different providers.

## Gotchas

- **Provider-side tracking must be disabled.** Resend and Postmark inject their own open pixel and click redirects by default. If left on, DakSend's analytics will undercount (their redirects fire first) and every link in the email gets double-wrapped. Set `tracking.opens = false` / `tracking.clicks = false` on Resend; disable the stream's open/link tracking on Postmark.
- **Postmark transactional vs broadcast.** Bulk campaigns must go through a broadcast message stream or Postmark rejects them. The provider config needs a `stream` field, and the factory must refuse to send a campaign on a transactional stream.
- **Webhook schemas all differ.** Resend uses svix signatures; Postmark uses basic auth or IP allowlist; SES uses SNS cert-chain verification; ACS uses Event Grid. Each provider implements its own `verifyWebhook`.
- **Bounce/complaint terminology varies.** Postmark has `HardBounce`, `SoftBounce`, `SpamComplaint`; Resend has `email.bounced`, `email.complained`. Each `parseWebhook` normalizes to DakSend's internal event shape.
- **ACS doesn't pass custom tags through.** The `campaign_id` correlation in `src/app/api/webhooks/ses/route.ts:48` relies on SES email tags. For ACS (and as a general pattern), stash `messageId → campaignId` in a table on send so any provider's webhook can resolve the campaign.
- **Rate limits vary wildly.** Resend starts at 10/sec on free tier; Postmark is per-server-token; SES is account-level; ACS is per-message with no per-second cap. `SEND_RATE` and warmup still work, but the ceiling and failure mode differ per provider.
- **Suppression list stays in DakSend.** Check DakSend's suppression before calling `provider.send()` — don't rely on provider-level suppression since it's not shared across providers if a user switches.

## Out of Scope

- Running a pooled sender account on behalf of customers ("managed mode") — keeps DakSend out of deliverability risk, abuse moderation, and billing-per-email. BYO-key is the product.
- Template syncing to provider-side template stores (Postmark/SES both support this). DakSend renders HTML itself; provider templates are a different product.
