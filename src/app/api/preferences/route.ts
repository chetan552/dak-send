import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redisRateLimit } from "@/lib/redis-rate-limit";
import { verifyToken } from "@/lib/sign-url";

interface PrefsToken { i: string; }

// Resolve the subscriber from either a signed token (?s=) or the legacy unsigned
// id (?i=). The `signed` flag is the authorization boundary: subscriber IDs are
// cuids, not secrets, so an unsigned id must NOT unlock PII disclosure or
// account mutation — only the compliance-required one-click "unsubscribe from
// all". Full preference management requires a signed token.
function resolveSubscriber(searchParams: URLSearchParams): { id: string; signed: boolean } | null {
    const s = searchParams.get("s");
    if (s) {
        const claims = verifyToken<PrefsToken>("prefs", s);
        return claims?.i ? { id: claims.i, signed: true } : null;
    }
    const i = searchParams.get("i");
    return i ? { id: i, signed: false } : null;
}

// ---------------------------------------------------------------------------
// GET — render the preference center HTML page
//       ?i=<subscriberId>
//       ?action=unsubscribe_all&i=<subscriberId>  (one-click unsubscribe all)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    const limited = await redisRateLimit(req, "preferences", 30, 60);
    if (limited) return limited;

    const resolved = resolveSubscriber(req.nextUrl.searchParams);
    const action = req.nextUrl.searchParams.get("action");

    if (!resolved) {
        return new NextResponse("Missing or invalid subscriber token", { status: 400 });
    }
    const { id: subscriberId, signed } = resolved;
    const token = signed ? req.nextUrl.searchParams.get("s") : null;

    const subscriber = await prisma.subscriber.findUnique({
        where: { id: subscriberId },
        include: {
            list: {
                include: {
                    brand: {
                        include: { lists: true },
                    },
                },
            },
        },
    });

    if (!subscriber) {
        return new NextResponse("Subscriber not found", { status: 404 });
    }

    // ── Unsubscribe-all confirm page ─────────────────────────────────────────
    // Rendered when the user explicitly asks to unsubscribe from all, OR for any
    // unsigned (legacy) link — an unsigned link discloses no PII and can only
    // reach this protective action, never the full preference center below.
    // The actual unsubscribe is done via POST to prevent CSRF/accidental prefetch.
    if (!signed || action === "unsubscribe_all") {
        const brandName = esc(subscriber.list.brand.name);
        // Carry the signed token forward when present so the POST is authorized;
        // otherwise fall back to the raw id (unsubscribe-all is the only action
        // the unsigned path permits, and it is user-protective).
        const authField = signed
            ? `<input type="hidden" name="token" value="${esc(token!)}">`
            : `<input type="hidden" name="subscriberId" value="${esc(subscriberId)}">`;
        return new NextResponse(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Confirm Unsubscribe — ${brandName}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f5;}
.card{text-align:center;padding:3rem;border-radius:12px;background:white;box-shadow:0 2px 16px rgba(0,0,0,.08);max-width:420px;}
h1{font-size:1.375rem;margin:0 0 .75rem;}p{margin:0 0 1.5rem;color:#71717a;font-size:.9375rem;}
.btn-red{padding:10px 24px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-size:.9375rem;font-weight:600;cursor:pointer;}
.btn-ghost{padding:10px 24px;border-radius:8px;border:1.5px solid #e4e4e7;background:#fff;font-size:.9375rem;color:#3f3f46;cursor:pointer;margin-left:8px;}</style>
</head>
<body><div class="card">
<h1>Unsubscribe from all?</h1>
<p>You will no longer receive any emails from <strong>${brandName}</strong>.</p>
<form method="POST" action="/api/preferences">
  <input type="hidden" name="action" value="unsubscribe_all">
  ${authField}
  <button class="btn-red" type="submit">Yes, unsubscribe me</button>
  <button class="btn-ghost" type="button" onclick="history.back()">Cancel</button>
</form>
</div></body></html>`, {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    }

    // ── Build per-list subscription state ───────────────────────────────────
    const brandId = subscriber.list.brand.id;
    const brandName = subscriber.list.brand.name;
    const brandLists = subscriber.list.brand.lists;

    const subscriberListRecords = await prisma.subscriber.findMany({
        where: { email: subscriber.email, list: { brandId } },
        select: { listId: true, status: true },
    });

    const listStatusMap = new Map(subscriberListRecords.map(s => [s.listId, s.status]));

    // ── Pause state ──────────────────────────────────────────────────────────
    // pausedUntil is per-subscriber record; use the current one as the source
    // of truth (they are all synced via the pause action).
    const now = new Date();
    const isPaused = subscriber.pausedUntil != null && subscriber.pausedUntil > now;
    const pausedUntilStr = isPaused
        ? subscriber.pausedUntil!.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Email Preferences — ${esc(brandName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f4f5;color:#18181b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 32px rgba(0,0,0,.08);max-width:480px;width:100%;overflow:hidden;}
.header{padding:28px 32px 24px;border-bottom:1px solid #f0f0f0;text-align:center;}
.brand{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#71717a;margin-bottom:8px;}
.header h1{font-size:1.375rem;font-weight:700;color:#18181b;}
.header p{color:#71717a;font-size:.875rem;margin-top:4px;}
.section{padding:20px 32px;}
.section+.section{border-top:1px solid #f4f4f5;}
.section-label{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a1a1aa;margin-bottom:12px;}
.list-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;}
.list-row:not(:last-child){border-bottom:1px solid #f4f4f5;}
.list-name{font-size:.9375rem;font-weight:500;color:#18181b;}
.toggle{position:relative;width:42px;height:24px;cursor:pointer;flex-shrink:0;}
.toggle input{opacity:0;width:0;height:0;position:absolute;}
.slider{position:absolute;inset:0;background:#e4e4e7;border-radius:12px;transition:.18s;}
.toggle input:checked+.slider{background:#2563eb;}
.slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.18s;box-shadow:0 1px 3px rgba(0,0,0,.2);}
.toggle input:checked+.slider:before{transform:translateX(18px);}
.pause-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.pause-btn{padding:8px 4px;border-radius:8px;border:1.5px solid #e4e4e7;background:#fff;font-size:.8125rem;font-weight:600;color:#3f3f46;cursor:pointer;transition:.15s;text-align:center;}
.pause-btn:hover{border-color:#2563eb;color:#2563eb;background:#eff6ff;}
.paused-banner{background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.paused-banner span{font-size:.875rem;color:#713f12;font-weight:500;}
.resume-btn{padding:6px 14px;border-radius:6px;border:none;background:#fff;color:#2563eb;font-size:.8125rem;font-weight:600;cursor:pointer;border:1.5px solid #bfdbfe;transition:.15s;}
.resume-btn:hover{background:#eff6ff;}
.footer-row{padding:16px 32px 20px;border-top:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.save-btn{flex:1;padding:10px;border-radius:8px;border:none;background:#2563eb;color:#fff;font-size:.875rem;font-weight:600;cursor:pointer;transition:.15s;}
.save-btn:hover{background:#1d4ed8;}
.save-btn:disabled{opacity:.5;cursor:not-allowed;}
.unsub-all{font-size:.75rem;color:#ef4444;text-decoration:none;white-space:nowrap;}
.unsub-all:hover{text-decoration:underline;}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(40px);background:#18181b;color:#fff;padding:10px 20px;border-radius:8px;font-size:.875rem;font-weight:500;opacity:0;transition:.25s;pointer-events:none;z-index:100;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
@media(prefers-color-scheme:dark){
body{background:#09090b;color:#fafafa;}
.card{background:#18181b;box-shadow:0 4px 32px rgba(0,0,0,.4);}
.header{border-bottom-color:#27272a;}
.header h1{color:#fafafa;}
.header p,.brand{color:#a1a1aa;}
.section+.section{border-top-color:#27272a;}
.list-row:not(:last-child){border-bottom-color:#27272a;}
.list-name{color:#fafafa;}
.slider{background:#3f3f46;}
.pause-btn{background:#27272a;border-color:#3f3f46;color:#d4d4d8;}
.pause-btn:hover{border-color:#3b82f6;color:#60a5fa;background:#1e3a5f;}
.footer-row{border-top-color:#27272a;}
.list-row:not(:last-child){border-bottom-color:#27272a;}
}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="brand">${esc(brandName)}</div>
    <h1>Email Preferences</h1>
    <p>Manage your subscriptions for <strong>${esc(subscriber.email)}</strong></p>
  </div>

  <!-- Lists -->
  ${brandLists.length > 0 ? `
  <div class="section">
    <div class="section-label">Your Lists</div>
    ${brandLists.map(l => {
        const status = listStatusMap.get(l.id) || "unsubscribed";
        const checked = status === "subscribed" ? "checked" : "";
        return `<div class="list-row">
      <span class="list-name">${esc(l.name)}</span>
      <label class="toggle" title="${checked ? "Unsubscribe from" : "Subscribe to"} ${esc(l.name)}">
        <input type="checkbox" class="list-toggle" data-list-id="${esc(l.id)}" ${checked}>
        <span class="slider"></span>
      </label>
    </div>`;
    }).join("")}
  </div>` : ""}

  <!-- Pause -->
  <div class="section">
    <div class="section-label">Pause Emails</div>
    ${isPaused ? `
    <div class="paused-banner">
      <span>⏸ Emails paused until ${esc(pausedUntilStr)}</span>
      <button class="resume-btn" id="resumeBtn">Resume</button>
    </div>` : `
    <p style="font-size:.8125rem;color:#71717a;margin-bottom:10px;">Take a break without losing your subscriptions.</p>
    <div class="pause-grid">
      <button class="pause-btn" data-days="30">Pause 30 days</button>
      <button class="pause-btn" data-days="60">Pause 60 days</button>
      <button class="pause-btn" data-days="90">Pause 90 days</button>
    </div>`}
  </div>

  <!-- Footer actions -->
  <div class="footer-row">
    <button class="save-btn" id="saveBtn">Save Preferences</button>
    <a class="unsub-all" href="/api/preferences?action=unsubscribe_all&s=${encodeURIComponent(token!)}">Unsubscribe from all</a>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
(function() {
  var token = ${JSON.stringify(token)};
  var brandId = ${JSON.stringify(brandId)};

  function showToast(msg, color) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = color || '#18181b';
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2800);
  }

  // Save preferences
  document.getElementById('saveBtn').addEventListener('click', function() {
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    var selectedLists = Array.from(document.querySelectorAll('.list-toggle:checked')).map(function(el) { return el.dataset.listId; });
    fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_prefs', token: token, brandId: brandId, selectedLists: selectedLists })
    }).then(function(r) { return r.json(); }).then(function() {
      showToast('Preferences saved!', '#166534');
    }).catch(function() {
      showToast('Something went wrong. Please try again.', '#991b1b');
    }).finally(function() {
      btn.disabled = false;
      btn.textContent = 'Save Preferences';
    });
  });

  // Pause buttons
  Array.from(document.querySelectorAll('.pause-btn')).forEach(function(btn) {
    btn.addEventListener('click', function() {
      var days = this.dataset.days;
      this.textContent = 'Pausing…';
      fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', token: token, brandId: brandId, days: parseInt(days, 10) })
      }).then(function(r) { return r.json(); }).then(function() {
        showToast('Emails paused for ' + days + ' days.', '#1e3a5f');
        setTimeout(function() { location.reload(); }, 1000);
      }).catch(function() {
        showToast('Something went wrong.', '#991b1b');
      });
    });
  });

  // Resume button
  var resumeBtn = document.getElementById('resumeBtn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', function() {
      this.textContent = 'Resuming…';
      fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', token: token, brandId: brandId })
      }).then(function(r) { return r.json(); }).then(function() {
        showToast('Emails resumed!', '#166534');
        setTimeout(function() { location.reload(); }, 900);
      }).catch(function() {
        showToast('Something went wrong.', '#991b1b');
      });
    });
  }
})();
</script>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
    });
}

// ---------------------------------------------------------------------------
// POST — handle preference actions (JSON body)
//
// Authorized by `token` (signed) for all actions; a legacy unsigned
// `subscriberId` is accepted only for `unsubscribe_all`.
// { action: "save_prefs", token, brandId, selectedLists: string[] }
// { action: "pause",      token, brandId, days: 30|60|90 }
// { action: "resume",     token, brandId }
// { action: "unsubscribe_all", token | subscriberId }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    const limited = await redisRateLimit(req, "preferences", 30, 60);
    if (limited) return limited;

    // Accept both JSON (from the in-page JS) and form submissions (unsubscribe_all confirm page)
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, unknown>;
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const fd = await req.formData();
        body = Object.fromEntries(fd.entries()) as Record<string, unknown>;
    } else {
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
    }

    const { action, brandId } = body as { action?: string; brandId?: string };

    // Authorization: a signed token is authoritative and unlocks every action.
    // A raw subscriberId (legacy, unsigned) is NOT proof of ownership — a cuid is
    // guessable/observable — so it may only perform the user-protective
    // "unsubscribe_all". PII-bearing or mutating actions (save_prefs/pause/resume)
    // require the token.
    let subscriberId: string | null = null;
    let viaToken = false;
    if (typeof body.token === "string" && body.token) {
        const claims = verifyToken<PrefsToken>("prefs", body.token);
        if (!claims?.i) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        subscriberId = claims.i;
        viaToken = true;
    } else if (typeof body.subscriberId === "string" && body.subscriberId) {
        subscriberId = body.subscriberId;
    }

    if (!subscriberId) {
        return NextResponse.json({ error: "Missing subscriber token" }, { status: 400 });
    }

    if (!viaToken && action !== "unsubscribe_all") {
        return NextResponse.json({ error: "This action requires a signed link." }, { status: 403 });
    }

    // Verify the subscriber exists; fetch brand info for unsubscribe_all
    const subscriber = await prisma.subscriber.findUnique({
        where: { id: subscriberId },
        select: { email: true, list: { select: { brandId: true, brand: { select: { name: true } } } } },
    });

    if (!subscriber) {
        return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    const resolvedBrandId = brandId ?? subscriber.list.brandId;
    if (subscriber.list.brandId !== resolvedBrandId) {
        return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    const email = subscriber.email;

    try {
        if (action === "unsubscribe_all") {
            await prisma.subscriber.updateMany({
                where: { email, list: { brandId: resolvedBrandId } },
                data: { status: "unsubscribed", pausedUntil: null },
            });
            return new NextResponse(getConfirmHtml("Unsubscribed", `You have been unsubscribed from all emails from ${esc(subscriber.list.brand.name)}.`), {
                status: 200,
                headers: { "Content-Type": "text/html" },
            });
        }

        if (!brandId) {
            return NextResponse.json({ error: "Missing brandId" }, { status: 400 });
        }

        if (action === "save_prefs") {
            const selectedLists: string[] = Array.isArray(body.selectedLists) ? body.selectedLists : [];

            const brandLists = await prisma.list.findMany({ where: { brandId: resolvedBrandId }, select: { id: true } });

            for (const list of brandLists) {
                if (selectedLists.includes(list.id)) {
                    await prisma.subscriber.upsert({
                        where: { email_listId: { email, listId: list.id } },
                        update: { status: "subscribed" },
                        create: { email, listId: list.id, status: "subscribed" },
                    });
                } else {
                    await prisma.subscriber.updateMany({
                        where: { email, listId: list.id },
                        data: { status: "unsubscribed" },
                    });
                }
            }

            return NextResponse.json({ success: true });
        }

        if (action === "pause") {
            const days = typeof body.days === "number" && [30, 60, 90].includes(body.days) ? body.days : 30;
            const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

            // Apply pausedUntil to ALL subscriber records for this email under this brand
            await prisma.subscriber.updateMany({
                where: { email, list: { brandId: resolvedBrandId } },
                data: { pausedUntil },
            });

            return NextResponse.json({ success: true, pausedUntil: pausedUntil.toISOString() });
        }

        if (action === "resume") {
            await prisma.subscriber.updateMany({
                where: { email, list: { brandId: resolvedBrandId } },
                data: { pausedUntil: null },
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    } catch (error) {
        console.error("Preference POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function getConfirmHtml(title: string, message: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f5;color:#18181b;}
.card{text-align:center;padding:3rem;border-radius:12px;background:white;box-shadow:0 2px 16px rgba(0,0,0,.08);max-width:400px;}
h1{font-size:1.375rem;margin:0 0 .5rem;}p{margin:0;color:#71717a;font-size:.9375rem;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

function esc(str: string): string {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
