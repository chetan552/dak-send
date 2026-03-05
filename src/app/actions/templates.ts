"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Built-in Templates ─────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
    {
        id: "builtin-minimal",
        name: "Minimal",
        category: "Newsletter",
        description: "Clean, text-focused layout for simple newsletters.",
        builtIn: true,
        html: `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
<h1 style="font-size: 28px; font-weight: 700; color: #111; margin-bottom: 8px;">[Subject]</h1>
<p style="color: #666; font-size: 14px; margin-bottom: 32px;">By [Brand Name]</p>
<div style="font-size: 16px; line-height: 1.7; color: #333;">
<p>Hi [Name],</p>
<p>Your content goes here. Write something compelling to engage your audience.</p>
<p>Best,<br>[Brand Name]</p>
</div>
<hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
<p style="font-size: 12px; color: #999; text-align: center;">[Unsubscribe]</p>
</div>`
    },
    {
        id: "builtin-hero",
        name: "Hero Banner",
        category: "Marketing",
        description: "Bold gradient hero with CTA button.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.05);">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:60px 40px;text-align:center;">
<h1 style="color:white;font-size:32px;margin:0 0 12px;font-weight:700;">Your Headline Here</h1>
<p style="color:rgba(255,255,255,.8);font-size:16px;margin:0 0 24px;">A compelling subheadline that drives action.</p>
<a href="#" style="background:white;color:#667eea;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;">Call to Action</a>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#333;font-size:16px;line-height:1.7;">Hi [Name],</p>
<p style="color:#333;font-size:16px;line-height:1.7;">Write your main content here. Keep it engaging and concise.</p>
<p style="color:#333;font-size:16px;line-height:1.7;">Best regards,<br>[Brand Name]</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-two-column",
        name: "Two Column",
        category: "Newsletter",
        description: "Side-by-side content cards for digests.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.05);">
<tr><td style="padding:32px 40px;border-bottom:1px solid #eee;">
<h1 style="margin:0;font-size:24px;color:#111;">📰 Weekly Digest</h1>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="color:#333;font-size:16px;line-height:1.7;">Hi [Name], here's what you missed this week:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr>
<td width="48%" valign="top" style="padding-right:16px;">
<div style="background:#f9fafb;border-radius:8px;padding:20px;">
<h3 style="margin:0 0 8px;color:#111;font-size:16px;">Article Title</h3>
<p style="margin:0;color:#666;font-size:14px;line-height:1.5;">Brief description of the article content goes here.</p>
<a href="#" style="color:#2563eb;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;margin-top:12px;">Read More →</a>
</div>
</td>
<td width="48%" valign="top" style="padding-left:16px;">
<div style="background:#f9fafb;border-radius:8px;padding:20px;">
<h3 style="margin:0 0 8px;color:#111;font-size:16px;">Article Title</h3>
<p style="margin:0;color:#666;font-size:14px;line-height:1.5;">Brief description of the article content goes here.</p>
<a href="#" style="color:#2563eb;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;margin-top:12px;">Read More →</a>
</div>
</td>
</tr>
</table>
</td></tr>
<tr><td style="padding:20px 40px;background:#fafafa;border-top:1px solid #eee;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-product-launch",
        name: "Product Launch",
        category: "Marketing",
        description: "Dark-themed launch announcement with features.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#111;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333;">
<tr><td style="padding:60px 40px;text-align:center;background:linear-gradient(135deg,#1e3a5f 0%,#0d1b2a 100%);">
<p style="color:#60a5fa;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Introducing</p>
<h1 style="color:white;font-size:36px;margin:0 0 16px;font-weight:700;">Product Name</h1>
<p style="color:#94a3b8;font-size:16px;margin:0 0 32px;max-width:400px;display:inline-block;">The revolutionary new way to do something amazing.</p>
<a href="#" style="background:#3b82f6;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;">Get Started →</a>
</td></tr>
<tr><td style="padding:40px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:16px 0;border-bottom:1px solid #333;">
<h3 style="margin:0 0 4px;color:white;font-size:16px;">⚡ Feature One</h3>
<p style="margin:0;color:#94a3b8;font-size:14px;">Description of the first key feature.</p>
</td></tr>
<tr><td style="padding:16px 0;border-bottom:1px solid #333;">
<h3 style="margin:0 0 4px;color:white;font-size:16px;">🎯 Feature Two</h3>
<p style="margin:0;color:#94a3b8;font-size:14px;">Description of the second key feature.</p>
</td></tr>
<tr><td style="padding:16px 0;">
<h3 style="margin:0 0 4px;color:white;font-size:16px;">🔒 Feature Three</h3>
<p style="margin:0;color:#94a3b8;font-size:14px;">Description of the third key feature.</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:20px 40px;background:#111;border-top:1px solid #333;text-align:center;">
<p style="color:#666;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-plain-text",
        name: "Plain Text",
        category: "Personal",
        description: "Simple personal email, no frills.",
        builtIn: true,
        html: `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; color: #333;">
<p style="font-size: 16px; line-height: 1.8;">Hi [Name],</p>
<p style="font-size: 16px; line-height: 1.8;">I wanted to personally reach out to share something with you.</p>
<p style="font-size: 16px; line-height: 1.8;">Your main message goes here. Keep it conversational and authentic.</p>
<p style="font-size: 16px; line-height: 1.8;">Talk soon,<br>Your Name</p>
<p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px;">[Unsubscribe]</p>
</div>`
    },
    {
        id: "builtin-event-invite",
        name: "Event Invitation",
        category: "Events",
        description: "Elegant invite with RSVP and event details.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#faf5ff;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(139,92,246,.1);">
<tr><td style="padding:48px 40px;text-align:center;background:linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%);">
<p style="color:rgba(255,255,255,.7);font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">You're Invited</p>
<h1 style="color:white;font-size:32px;margin:0;font-weight:700;">Event Name</h1>
</td></tr>
<tr><td style="padding:40px;">
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<strong style="color:#6d28d9;font-size:13px;text-transform:uppercase;">When</strong><br>
<span style="color:#333;font-size:15px;">Saturday, January 1, 2027 at 7:00 PM</span>
</td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
<strong style="color:#6d28d9;font-size:13px;text-transform:uppercase;">Where</strong><br>
<span style="color:#333;font-size:15px;">123 Main Street, City, State</span>
</td></tr>
</table>
<p style="color:#333;font-size:16px;line-height:1.7;">Hi [Name], we'd love for you to join us!</p>
<p style="text-align:center;margin:32px 0;">
<a href="#" style="background:#8b5cf6;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;">RSVP Now</a>
</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#faf5ff;border-top:1px solid #f3e8ff;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-welcome-series",
        name: "Welcome Email",
        category: "Onboarding",
        description: "Warm welcome email for new subscribers.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(34,197,94,.1);">
<tr><td style="padding:48px 40px;text-align:center;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);">
<p style="font-size:48px;margin:0 0 8px;">👋</p>
<h1 style="color:white;font-size:28px;margin:0 0 8px;font-weight:700;">Welcome aboard!</h1>
<p style="color:rgba(255,255,255,.8);font-size:16px;margin:0;">We're thrilled to have you.</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#333;font-size:16px;line-height:1.7;">Hi [Name],</p>
<p style="color:#333;font-size:16px;line-height:1.7;">Thank you for subscribing! Here's what you can expect from us:</p>
<ul style="color:#333;font-size:16px;line-height:2;">
<li>Exclusive insights and tips</li>
<li>Early access to new features</li>
<li>Community updates and events</li>
</ul>
<p style="color:#333;font-size:16px;line-height:1.7;">If you have any questions, just reply to this email — we read every message.</p>
<p style="color:#333;font-size:16px;line-height:1.7;">Best,<br>[Brand Name]</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#f0fdf4;border-top:1px solid #dcfce7;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-sale",
        name: "Flash Sale",
        category: "E-commerce",
        description: "Urgent sale announcement with countdown feel.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#fef2f2;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(239,68,68,.1);">
<tr><td style="padding:48px 40px;text-align:center;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);">
<p style="color:rgba(255,255,255,.8);font-size:14px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">🔥 Limited Time</p>
<h1 style="color:white;font-size:42px;margin:0 0 8px;font-weight:800;">50% OFF</h1>
<p style="color:rgba(255,255,255,.8);font-size:18px;margin:0 0 28px;">Everything. No exceptions.</p>
<a href="#" style="background:white;color:#ef4444;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:18px;letter-spacing:.5px;">Shop Now →</a>
</td></tr>
<tr><td style="padding:40px;text-align:center;">
<p style="color:#333;font-size:16px;line-height:1.7;">Hi [Name],</p>
<p style="color:#333;font-size:16px;line-height:1.7;">Our biggest sale of the year is here — but it won't last long. Grab your favorites before they're gone!</p>
<p style="color:#999;font-size:14px;margin-top:24px;">Sale ends in 48 hours. No code needed.</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#fef2f2;border-top:1px solid #fee2e2;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-survey",
        name: "Feedback Survey",
        category: "Engagement",
        description: "Request customer feedback with rating scale.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#eff6ff;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(59,130,246,.08);">
<tr><td style="padding:40px;text-align:center;">
<p style="font-size:48px;margin:0 0 16px;">💬</p>
<h1 style="color:#111;font-size:26px;margin:0 0 8px;font-weight:700;">We'd love your feedback</h1>
<p style="color:#666;font-size:16px;margin:0 0 32px;">It only takes 30 seconds.</p>
<p style="color:#333;font-size:15px;margin-bottom:24px;">How would you rate your experience?</p>
<table cellpadding="0" cellspacing="8" style="margin:0 auto;">
<tr>
<td><a href="#" style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;border-radius:12px;background:#f1f5f9;font-size:22px;text-decoration:none;">😞</a></td>
<td><a href="#" style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;border-radius:12px;background:#f1f5f9;font-size:22px;text-decoration:none;">😐</a></td>
<td><a href="#" style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;border-radius:12px;background:#f1f5f9;font-size:22px;text-decoration:none;">🙂</a></td>
<td><a href="#" style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;border-radius:12px;background:#f1f5f9;font-size:22px;text-decoration:none;">😊</a></td>
<td><a href="#" style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;border-radius:12px;background:#f1f5f9;font-size:22px;text-decoration:none;">🤩</a></td>
</tr>
</table>
<p style="color:#333;font-size:16px;margin-top:32px;">Or share your thoughts in detail:</p>
<a href="#" style="background:#3b82f6;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;margin-top:8px;">Take Full Survey</a>
</td></tr>
<tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">Thanks, [Brand Name] • [Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    },
    {
        id: "builtin-reengagement",
        name: "Win-Back",
        category: "Engagement",
        description: "Re-engage inactive subscribers.",
        builtIn: true,
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#fefce8;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(234,179,8,.1);">
<tr><td style="padding:48px 40px;text-align:center;">
<p style="font-size:48px;margin:0 0 16px;">👀</p>
<h1 style="color:#111;font-size:28px;margin:0 0 8px;font-weight:700;">We miss you!</h1>
<p style="color:#666;font-size:16px;margin:0 0 32px;">It's been a while since we've heard from you.</p>
<p style="color:#333;font-size:16px;line-height:1.7;text-align:left;">Hi [Name],</p>
<p style="color:#333;font-size:16px;line-height:1.7;text-align:left;">We noticed you haven't opened our emails recently. We'd hate to see you go!</p>
<p style="color:#333;font-size:16px;line-height:1.7;text-align:left;">Here's what you've missed, plus a special offer just for you:</p>
<div style="background:#fefce8;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
<p style="font-size:24px;font-weight:700;color:#ca8a04;margin:0 0 4px;">🎁 20% OFF</p>
<p style="color:#666;font-size:14px;margin:0;">Use code: <strong>COMEBACK20</strong></p>
</div>
<p style="text-align:center;">
<a href="#" style="background:#eab308;color:#111;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:16px;">Come Back & Save</a>
</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#fefce8;border-top:1px solid #fef9c3;text-align:center;">
<p style="color:#999;font-size:12px;margin:0;">[Unsubscribe]</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`
    }
];

// ─── Server Actions ─────────────────────────────────────────────────────────

// Get all templates: built-in + user-saved
export async function getEmailTemplates() {
    return BUILT_IN_TEMPLATES;
}

export async function getAllTemplates(includeCustom = true) {
    const builtIn = BUILT_IN_TEMPLATES.map(t => ({
        ...t,
        isCustom: false,
        createdAt: null,
        userName: null,
    }));

    if (!includeCustom) return builtIn;

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";

    if (!userId) return builtIn;

    const where = role === "admin"
        ? {} // Admin sees all custom templates
        : { OR: [{ userId }, { isPublic: true }] };

    const custom = await (prisma as any).emailTemplate.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
    });

    const customMapped = custom.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description || "",
        html: t.html,
        builtIn: false,
        isCustom: true,
        isPublic: t.isPublic,
        createdAt: t.createdAt,
        userName: t.user?.name || t.user?.email,
        userId: t.userId,
    }));

    return [...customMapped, ...builtIn];
}

export async function saveTemplate(data: {
    name: string;
    category?: string;
    description?: string;
    html: string;
    isPublic?: boolean;
    brandId?: string;
}) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error("Unauthorized");

    const template = await (prisma as any).emailTemplate.create({
        data: {
            name: data.name,
            category: data.category || "Custom",
            description: data.description || null,
            html: data.html,
            isPublic: data.isPublic || false,
            userId,
            brandId: data.brandId || null,
        },
    });

    revalidatePath("/dashboard/templates");
    return template;
}

export async function deleteTemplate(id: string) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role || "user";
    if (!userId) throw new Error("Unauthorized");

    const where: any = role === "admin" ? { id } : { id, userId };
    const template = await (prisma as any).emailTemplate.findFirst({ where });
    if (!template) throw new Error("Template not found");

    await (prisma as any).emailTemplate.delete({ where: { id } });
    revalidatePath("/dashboard/templates");
}

export async function getTemplateById(id: string) {
    // Check built-in first
    const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === id);
    if (builtIn) return { ...builtIn, isCustom: false };

    const template = await (prisma as any).emailTemplate.findUnique({
        where: { id },
    });
    if (!template) throw new Error("Template not found");
    return { ...template, isCustom: true };
}
