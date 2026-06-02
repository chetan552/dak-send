# Sendy v7 Feature Parity — Implementation Plan

## Context

Sendy v7 shipped in May 2026 with a redesigned UI, a drag-and-drop builder, a file manager, an AI Assistant add-on, and a handful of smaller workflow improvements. DakSend already covers most of Sendy v6's surface (lists, segments, campaigns, automations, RSS, A/B, transactional API, multi-brand, warmup, suppression, tracking, dark mode). The gap is in **v7-specific additions**.

This plan inventories each Sendy v7 new feature, marks whether DakSend already has it, and estimates implementation complexity so the user can decide between Opus and Sonnet for the build phase.

**Decisions captured from clarifying questions:**
- AI Assistant: include all four features (template gen, subject lines, pre-send review, post-send insights).
- "SES Health Indicator" generalizes to a **provider-agnostic status widget** that fits the multi-provider direction in [email-provider-plan.md](email-provider-plan.md).

## Sendy v7 feature inventory vs DakSend

Legend: ✅ already in DakSend · 🆕 missing, in scope · ➖ skipped/N-A

| # | Sendy v7 feature | DakSend status | Complexity | Notes |
|---|---|---|---|---|
| 1 | AI template generation from description | 🆕 | **High** | Generates full block-JSON from a prompt |
| 2 | AI subject line generator | 🆕 | Low | Stateless call, paste back into form |
| 3 | AI pre-send review (deliverability/clarity warnings) | 🆕 | Medium | Runs on draft HTML, returns structured findings |
| 4 | AI post-send campaign insights | 🆕 | Medium | Reads analytics, returns plain-English summary |
| 5 | Per-brand AI feature toggle | 🆕 | Low | One boolean in `Setting`/brand |
| 6 | Drag-and-drop email builder | ✅ | — | Block editor at [src/components/campaign/block-editor.tsx](../src/components/campaign/block-editor.tsx) |
| 7 | Switch between drag-drop / WYSIWYG / raw HTML on same email | 🆕 | Medium | Add HTML round-trip + WYSIWYG view to block editor |
| 8 | File Manager (central image library) | 🆕 | **High** | New table, upload UI, picker inside block editor |
| 9 | Four built-in starter templates | 🆕 | Low | Seed `EmailTemplate` rows with `isPublic=true` |
| 10 | One-click template duplication | 🆕 | Low | Server action + button |
| 11 | Campaign entry-points dropdown (scratch / AI / import / template) | 🆕 | Low | Rework "New campaign" CTA into a menu |
| 12 | Import campaign from HTML or URL | 🆕 | Medium | Sanitize + parse into blocks (or store as raw HTML) |
| 13 | HTML editor with syntax highlighting + line numbers | 🆕 | Low | Drop CodeMirror or Monaco into the raw-HTML tab |
| 14 | CTOR (click-to-open rate) — campaign + per-link | 🆕 | Low | Derived metric; add to `analytics.ts` and report UI |
| 15 | Card-based campaign report redesign | 🆕 | Medium | UI-only pass on the analytics dashboard |
| 16 | Provider health indicator in sidebar | 🆕 | Medium | Provider-agnostic (per Q2 decision); polls each provider's quota/status API |
| 17 | Stop campaign mid-flight (Preparing → Draft; Sending → Sent) | 🆕 | Medium | Cancel BullMQ jobs + state transition |
| 18 | Customizable shortcut key for dark-mode toggle | 🆕 | Low | Settings field + key handler |
| 19 | Dark mode | ✅ | — | [src/components/theme-toggle.tsx](../src/components/theme-toggle.tsx) |
| 20 | 2× faster sending engine | ➖ | — | DakSend's BullMQ worker is already throughput-bound by SES/`SEND_RATE`; not a feature to "port" |
| 21 | New SES regions (Calgary, Malaysia) | ➖ | — | Falls out of generalized provider config |
| 22 | jQuery 4 / jQuery UI upgrades | ➖ | — | DakSend is React/Next, not applicable |
| 23 | Native SendGrid / Mailjet / Elastic Email support | 🆕 | Medium | Sendy supports these as SMTP providers in addition to SES. See "Additional providers" section below — folds into [email-provider-plan.md](email-provider-plan.md) |

## Implementation breakdown

### Tier A — Quick wins (1–2 days each, Sonnet-grade)
- [ ] **#5 Per-brand AI toggle.** New `Setting` key `AI_ENABLED` scoped per brand. Gate all AI server actions on it.
- [ ] **#9 Starter templates.** Add four `EmailTemplate` rows in [prisma/seed.ts](../prisma/seed.ts) flagged `isPublic=true`. Include block JSON + thumbnail.
- [ ] **#10 Template duplication.** Server action in [src/app/actions/templates.ts](../src/app/actions/templates.ts): deep-clone, append "(copy)" to name. Wire a button on the template card.
- [ ] **#11 Campaign entry-points dropdown.** Change the "New campaign" button in the campaigns index page into a dropdown with four items.
- [ ] **#13 Raw-HTML editor with syntax highlighting.** Replace the existing raw-HTML textarea with CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-html`).
- [ ] **#14 CTOR metric.** Compute in [src/app/actions/analytics.ts](../src/app/actions/analytics.ts) (clicks / opens, %) at campaign and per-link levels. Surface in the campaign report.
- [ ] **#18 Customizable dark-mode shortcut.** Add a key-binding input in user settings; persist on `User` and read in the theme toggle.
- [ ] **#2 AI subject line generator.** New server action `generateSubjectLines(html, audience)` → 5 candidates. Button in the campaign editor's subject row.

### Tier B — Medium features (2–4 days each, Sonnet OK with careful prompts)
- [ ] **#3 AI pre-send review.** `reviewCampaign(campaignId)` returns `{warnings: [], suggestions: [], score}`. Show as a modal before send. Use Claude with a structured-output schema.
- [ ] **#4 AI post-send insights.** `summarizeCampaignResults(campaignId)` reads opens/clicks/bounces/CTOR, returns short narrative + top wins/risks. Render on the campaign report page.
- [ ] **#7 Triple-mode editor toggle.** Add view-switcher above the block editor: Blocks ↔ WYSIWYG (existing TipTap) ↔ Raw HTML. Need lossless round-tripping (or warn on lossy switch).
- [ ] **#12 Import from HTML / URL.** Two paths: paste raw HTML (sanitize with DOMPurify, attempt to parse to blocks; fall back to single HTML block), or fetch a URL server-side and use the same pipeline.
- [ ] **#15 Card-based report redesign.** UI rework of [src/components/campaign/analytics/](../src/components/campaign/analytics/). No data changes — just layout. Add CTOR card.
- [ ] **#16 Provider status widget.** Build on top of the `EmailProvider.getQuota?()` hook proposed in [email-provider-plan.md](email-provider-plan.md). Sidebar component polls every 60s, renders pill: `Healthy` / `Throttled` / `At Limit` / `Suspended`. Per-provider implementations: SES → `GetAccount.EnforcementStatus`; Resend → API key validity; Postmark → `/server` quota; ACS → resource status.
- [ ] **#17 Stop campaign.** Server action that (a) sets `Campaign.status` → `draft`/`sent`, (b) calls BullMQ `removeJobs` for any queued jobs in this campaign, (c) updates outstanding `CampaignSend` rows to `cancelled`. Add "Stop" button on campaign detail when status is `queuing|sending`.

### Tier C — Large features (1–2 weeks, Opus recommended)
- [ ] **#1 AI template generation.** Given a prompt + brand voice, produce a full block-JSON tree compatible with [src/components/campaign/block-editor.tsx](../src/components/campaign/block-editor.tsx). Requires: a JSON schema describing the block format, a Claude tool-use call with that schema, validation/repair, and a preview-before-insert UI. Risk: getting valid block JSON consistently.
- [ ] **#8 File Manager.** New `MediaAsset` model (id, brandId, key, url, contentType, size, width, height, alt, createdAt). Upload route with content-type/size limits. S3/local storage abstraction. Grid UI at `/dashboard/media`. Picker dialog used by image blocks in the editor. Migration of any existing image references.

## Touchpoints (existing files to modify)

| File | Used by |
|---|---|
| [prisma/schema.prisma](../prisma/schema.prisma) | #8 `MediaAsset` model; #5 brand AI flag (via `Setting`) |
| [src/app/actions/templates.ts](../src/app/actions/templates.ts) | #10 duplication |
| [src/app/actions/campaign.ts](../src/app/actions/campaign.ts) | #11 entry points, #12 import, #17 stop |
| [src/app/actions/analytics.ts](../src/app/actions/analytics.ts) | #14 CTOR |
| [src/app/actions/](../src/app/actions/) | New: `ai.ts` for #1–#4 |
| [src/components/campaign/block-editor.tsx](../src/components/campaign/block-editor.tsx) | #7 mode toggle, #1 AI insert, #8 image picker |
| [src/components/campaign/analytics/](../src/components/campaign/analytics/) | #14, #15 |
| [src/components/sidebar-nav.tsx](../src/components/sidebar-nav.tsx) | #16 status widget |
| [src/components/theme-toggle.tsx](../src/components/theme-toggle.tsx) | #18 custom shortcut |
| [src/lib/queue.ts](../src/lib/queue.ts), [src/lib/worker.ts](../src/lib/worker.ts) | #17 stop (job removal + skip-on-cancelled check) |
| [prisma/seed.ts](../prisma/seed.ts) | #9 starter templates |

## New files

- `src/lib/ai/client.ts` — DeepSeek client (OpenAI-compatible SDK pointed at `https://api.deepseek.com`)
- `src/lib/ai/schemas.ts` — block-JSON schema, review schema, insights schema (used with DeepSeek function calling / JSON mode)
- `src/app/actions/ai.ts` — server actions for #1–#4
- `src/lib/storage/` — abstraction for #8 (S3 + local-disk drivers)
- `src/app/api/media/upload/route.ts` — direct-upload endpoint for #8
- `src/app/dashboard/media/page.tsx` — file manager UI
- `src/components/sidebar-provider-status.tsx` — #16
- `src/lib/email-provider/types.ts` (if not already created by the provider plan) — `getStatus()` method on `EmailProvider`

## Additional providers (#23 — SendGrid, Mailjet, Elastic Email)

Sendy ships with native support for SendGrid, Mailjet, and Elastic Email alongside Amazon SES. To match this, [email-provider-plan.md](email-provider-plan.md) — which currently covers Resend, Postmark, SES, and ACS — should be extended to add three more `EmailProvider` implementations:

| Provider | Transport | Auth | Webhook events | Notes |
|---|---|---|---|---|
| **SendGrid** | REST (`v3/mail/send`) or SMTP | API key | Event Webhook (signed with `X-Twilio-Email-Event-Webhook-Signature`) | `bounce`, `dropped`, `spamreport` normalize to DakSend's bounce/complaint events. Suppress provider-side open/click tracking via `tracking_settings`. |
| **Mailjet** | REST (`v3.1/send`) or SMTP | API key + secret | Parse API webhook (HMAC-SHA256 signed) | Categories: `bounce` (hard/soft via `hard_bounce` flag), `spam`, `blocked`. Disable provider tracking via `TrackOpens=disabled`, `TrackClicks=disabled`. |
| **Elastic Email** | REST (`v4/emails`) or SMTP | API key | Notification URL per event type | Events: `Bounced`, `AbuseReport`, `Unsubscribed`. Disable tracking via `TrackOpens=false`, `TrackClicks=false`. |

**Implementation notes:**
- All three expose REST APIs — prefer REST over SMTP for parity with the existing `EmailProvider.send()` shape (no SMTP connection pool to manage). SMTP fallback can be a later addition.
- Each one needs its own `parseWebhook` + `verifyWebhook` and a route under `/api/webhooks/<provider>/`.
- Each one should expose a `getStatus()` for #16 Provider status widget: SendGrid → `/v3/user/credits`, Mailjet → `/v3/REST/myprofile`, Elastic Email → `/v4/security/credit`.
- Provider-side tracking must be off (same rule as Resend/Postmark) so DakSend's pixel/click rewriter stays the single source of truth.

**Scope decision:** This row should ship as part of the email-provider plan's PR 2/PR 3, not as part of the Sendy v7 work. Listing here so the two plans don't drift.

## AI provider: DeepSeek

All four AI features (#1–#4) use **DeepSeek** via its OpenAI-compatible API. Rationale: ~10× cheaper than equivalent frontier models, with a quality bar that is acceptable for marketing-copy generation, structured review, and summarization.

- **SDK:** `openai` npm package, configured with `baseURL: "https://api.deepseek.com"` and `apiKey: process.env.DEEPSEEK_API_KEY`.
- **Models:**
  - `deepseek-chat` (V3) — default for #1 template generation, #2 subject lines, #4 insights. Fast, cheap, good at instructions.
  - `deepseek-reasoner` (R1) — optional for #3 pre-send review, where deliberate reasoning over deliverability/clarity criteria pays off. Slower and pricier; gate behind a setting.
- **Structured output:** Use OpenAI-compatible function calling for #1 (block-JSON), #3 (review schema), and #4 (insights schema). For free-form text (#2 subject lines), use plain completion + JSON parse.
- **Context caching:** DeepSeek does context caching automatically on identical prefixes — no client-side cache control needed. Keep system prompts stable across calls for the same feature so cache hits stick.
- **Failure mode:** Wrap calls with a 30s timeout and a single retry on 5xx. If DeepSeek is unreachable, AI features return a friendly "unavailable" state rather than blocking the send/review flow.
- **PII / data residency:** DeepSeek's API runs in China. If the brand has a privacy-sensitive audience, the per-brand `AI_ENABLED` toggle (#5) is the off-switch. Mention this in the settings UI copy.

## Env vars to add

```
DEEPSEEK_API_KEY=          # AI Assistant (#1–#4) — DeepSeek API key
DEEPSEEK_MODEL_DEFAULT=    # optional, defaults to "deepseek-chat"
DEEPSEEK_MODEL_REASONER=   # optional, defaults to "deepseek-reasoner" (used by #3)
MEDIA_STORAGE=             # "local" | "s3"
MEDIA_S3_BUCKET=           # if s3
MEDIA_S3_REGION=
MEDIA_PUBLIC_URL=          # public base URL for served media
```

## Suggested ordering (3 PRs)

- **PR 1 — Quick wins + analytics polish.** Tier A items + #15. No new deps beyond CodeMirror. Sonnet.
- **PR 2 — AI Assistant.** Tier B AI items (#2, #3, #4) + Tier C #1. Adds the `openai` SDK pointed at DeepSeek, function-calling for structured output, block-JSON schema. Opus recommended for the implementation work on #1; Sonnet fine for the implementation work on #2–#4.
- **PR 3 — File manager + stop + provider status + import.** Tier C #8, plus #7, #12, #16, #17. Touches storage and worker — Opus for #8, Sonnet for the rest.

## Model recommendation (for implementing this plan)

This is about which Claude model to use **to write the code**. The product's runtime AI (#1–#4) uses **DeepSeek** regardless — see the AI provider section above.

- **Sonnet (build with):** Tier A (all 8 items) and Tier B excluding #16. These are pattern-matching CRUD + UI + straightforward LLM API integrations.
- **Opus (build with):** Tier C, especially **#1 AI template generation** (constrained JSON output that has to round-trip cleanly through the block editor — needs careful schema + repair-loop design) and **#8 File Manager** (touches storage, schema, multiple UI surfaces). Also **#16 Provider status** if it lands before [email-provider-plan.md](email-provider-plan.md) is executed — there's design judgment in shaping the `EmailProvider.getStatus()` contract.
- **If picking a single model for the whole effort:** Opus, because #1 and #8 are the riskiest pieces and benefit from stronger planning.

## Verification

- **Unit:** none currently in the project (`CLAUDE.md` notes no test suite).
- **Manual end-to-end per feature:**
  - AI: trigger each action from the campaign editor, confirm output renders, confirm `AI_ENABLED=false` hides the buttons.
  - File manager: upload, list, delete, pick into a block, send a test campaign, confirm image renders in the inbox.
  - Stop campaign: queue a 5k-subscriber campaign, hit Stop mid-send, confirm BullMQ queue depth drops and no further sends fire (`/admin/queues` if Bull-Board is installed, or `redis-cli`).
  - Provider status: misconfigure a key, confirm the sidebar pill flips to `Suspended`; restore, confirm `Healthy`.
  - Import HTML: paste a real provider export (Mailchimp/Substack), confirm renders without script tags.
  - CTOR: run a campaign, click some links, check the report shows CTOR at the campaign and link levels.

## Out of scope

- Replicating Sendy's specific sending-speed gains (DakSend's bottleneck is provider rate limits, not the worker loop).
- Provider-side template stores or AMP-for-email.
- Mobile app / native shells.
- Replacing the existing block editor with a different drag-drop library — #7 just adds modes around it.

## Sources

- [Sendy 7 Review: What's New in Version 7](https://www.sendybay.com/blog/sendy-v7-review-whats-new)
- [Michael Tsai — Sendy 7](https://mjtsai.com/blog/2026/05/07/sendy-7/)
- [Sendy v7 release thread (afflift)](https://afflift.com/f/threads/sendy-7-released-major-update.16459/)
- [Sendy homepage](https://sendy.co/)
- [Sendy API docs](https://sendy.co/api)
