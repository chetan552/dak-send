import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public subscriber preference center
export async function GET(req: NextRequest) {
    const subscriberId = req.nextUrl.searchParams.get("i");

    if (!subscriberId) {
        return new NextResponse("Missing subscriber ID", { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
        where: { id: subscriberId },
        include: {
            list: {
                include: {
                    brand: {
                        include: {
                            lists: {
                                include: {
                                    _count: { select: { subscribers: true } }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!subscriber) {
        return new NextResponse("Subscriber not found", { status: 404 });
    }

    // Get all lists this subscriber is subscribed to under the same brand
    const brandLists = subscriber.list.brand.lists;
    const subscriberLists = await prisma.subscriber.findMany({
        where: { email: subscriber.email, list: { brandId: subscriber.list.brand.id } },
        include: { list: true }
    });

    const subscribedListIds = new Set(subscriberLists.filter(s => s.status === 'subscribed').map(s => s.listId));

    const html = `<!DOCTYPE html>
<html><head><title>Email Preferences</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;color:#333;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.card{background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.06);max-width:500px;width:100%;overflow:hidden;}
.header{padding:32px;border-bottom:1px solid #f3f4f6;text-align:center;}
.header h1{font-size:1.5rem;font-weight:700;margin-bottom:4px;}
.header p{color:#6b7280;font-size:.875rem;}
.lists{padding:24px 32px;}
.list-item{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid #f3f4f6;}
.list-item:last-child{border-bottom:none;}
.list-name{font-weight:500;font-size:.9375rem;}
.toggle{position:relative;width:44px;height:24px;cursor:pointer;}
.toggle input{opacity:0;width:0;height:0;}
.toggle .slider{position:absolute;top:0;left:0;right:0;bottom:0;background:#e5e7eb;border-radius:12px;transition:.2s;}
.toggle input:checked+.slider{background:#3b82f6;}
.toggle .slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.2s;}
.toggle input:checked+.slider:before{transform:translateX(20px);}
.footer{padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center;}
.btn{background:#3b82f6;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;font-size:.875rem;}
.btn:hover{background:#2563eb;}
.unsub-all{font-size:.75rem;color:#ef4444;text-decoration:none;margin-top:12px;display:inline-block;}
.unsub-all:hover{text-decoration:underline;}
.msg{text-align:center;padding:20px;color:#059669;font-weight:500;}
</style></head>
<body>
<div class="card">
<div class="header">
<h1>📧 Email Preferences</h1>
<p>Manage your subscriptions for ${subscriber.list.brand.name}</p>
</div>
<form id="prefForm" method="POST" action="/api/preferences">
<input type="hidden" name="subscriberEmail" value="${subscriber.email}" />
<input type="hidden" name="brandId" value="${subscriber.list.brand.id}" />
<div class="lists">
${brandLists.map(l => `
<div class="list-item">
<span class="list-name">${l.name}</span>
<label class="toggle">
<input type="checkbox" name="lists" value="${l.id}" ${subscribedListIds.has(l.id) ? 'checked' : ''} />
<span class="slider"></span>
</label>
</div>`).join('')}
</div>
<div class="footer">
<button type="submit" class="btn">Save Preferences</button><br>
<a href="/api/preferences?action=unsubscribe_all&email=${encodeURIComponent(subscriber.email)}&brandId=${subscriber.list.brand.id}" class="unsub-all">Unsubscribe from all</a>
</div>
</form>
<div id="msg" class="msg" style="display:none;">Preferences saved!</div>
</div>
<script>
document.getElementById('prefForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fd = new FormData(this);
  await fetch('/api/preferences', { method: 'POST', body: fd });
  this.style.display='none';
  document.getElementById('msg').style.display='block';
});
</script>
</body></html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html" }
    });
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const subscriberEmail = formData.get("subscriberEmail") as string;
        const brandId = formData.get("brandId") as string;
        const selectedLists = formData.getAll("lists") as string[];

        if (!subscriberEmail || !brandId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Get all lists under this brand
        const brandLists = await prisma.list.findMany({
            where: { brandId }
        });

        for (const list of brandLists) {
            const isSelected = selectedLists.includes(list.id);

            if (isSelected) {
                // Subscribe (upsert)
                await prisma.subscriber.upsert({
                    where: { email_listId: { email: subscriberEmail, listId: list.id } },
                    update: { status: "subscribed" },
                    create: { email: subscriberEmail, listId: list.id, status: "subscribed" }
                });
            } else {
                // Unsubscribe (update if exists)
                await prisma.subscriber.updateMany({
                    where: { email: subscriberEmail, listId: list.id },
                    data: { status: "unsubscribed" }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Preference update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
