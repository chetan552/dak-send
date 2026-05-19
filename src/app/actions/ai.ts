"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatJson, AiUnavailableError } from "@/lib/ai/client";

function aiErrorMessage(reason: AiUnavailableError["reason"]): string {
    switch (reason) {
        case "no_api_key":      return "AI provider is not configured. Pick a provider and add its API key in Settings → AI Assistant.";
        case "no_base_url":     return "Custom AI provider needs a base URL. Set AI_CUSTOM_BASE_URL in Settings → AI Assistant.";
        case "disabled_for_brand": return "AI is disabled for this brand.";
        case "disabled_globally":  return "AI is disabled platform-wide.";
    }
}
import { getAiAvailability, setBrandAiEnabled } from "@/lib/ai/config";
import { revalidatePath } from "next/cache";
import { htmlToText } from "html-to-text";
import { randomUUID } from "crypto";
import type { BlockEmailDocument, EmailBlock } from "@/lib/blocks-to-html";
import { compileBlocksToHtml } from "@/lib/blocks-to-html";
import { sanitizeEmailHtml } from "@/lib/sanitize-email-html";

async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user;
}

async function requireBrandAccess(brandId: string) {
    const user = await requireUser();
    const role = user.role || "user";
    const where = role === "admin"
        ? { id: brandId }
        : {
            id: brandId,
            OR: [{ userId: user.id }, { users: { some: { id: user.id } } }],
        };
    const brand = await prisma.brand.findFirst({ where });
    if (!brand) throw new Error("Brand not found or access denied");
    return brand;
}

export async function getBrandAiAvailability(brandId: string) {
    await requireBrandAccess(brandId);
    return getAiAvailability(brandId);
}

export async function toggleBrandAi(brandId: string, enabled: boolean) {
    await requireBrandAccess(brandId);
    await setBrandAiEnabled(brandId, enabled);
    revalidatePath(`/dashboard/brands/${brandId}`);
    revalidatePath("/dashboard/settings");
    return { success: true };
}

async function loadCampaignForBrandAccess(campaignId: string) {
    const user = await requireUser();
    const role = user.role || "user";
    const where = role === "admin"
        ? { id: campaignId }
        : { id: campaignId, brand: { users: { some: { id: user.id } } } };
    const campaign = await prisma.campaign.findFirst({
        where,
        include: { brand: true },
    });
    if (!campaign) throw new Error("Campaign not found");
    return campaign;
}

export interface CampaignReview {
    score: number;
    summary: string;
    warnings: Array<{ severity: "high" | "medium" | "low"; message: string }>;
    suggestions: Array<{ area: "subject" | "content" | "deliverability" | "structure"; message: string }>;
}

export async function reviewCampaign(campaignId: string): Promise<CampaignReview> {
    const campaign = await loadCampaignForBrandAccess(campaignId);
    const bodyText = htmlToText(campaign.htmlText || "", { wordwrap: false }).slice(0, 20000);

    if (!bodyText.trim()) throw new Error("Campaign has no content yet.");

    const messages = [
        {
            role: "system" as const,
            content: [
                "You are a JSON-only email pre-send reviewer API. You return one JSON object and nothing else.",
                "",
                "You evaluate email campaigns for deliverability and clarity. Be specific and honest. Avoid generic advice.",
                "",
                "Do not comment on theology, religious interpretation, or the author's viewpoint. The message content's opinions are not your concern — only how it will perform.",
                "",
                "The platform guarantees an unsubscribe link in every sent email — it auto-appends a CAN-SPAM-compliant unsubscribe footer at send time if the author hasn't included one. Do NOT flag 'missing unsubscribe link' under any circumstances; the recipient will always see one.",
            ].join("\n"),
        },
        {
            role: "user" as const,
            content: [
                `Subject: ${campaign.subject}`,
                `From: ${campaign.brand?.fromName || ""} <${campaign.brand?.fromEmail || ""}>`,
                "",
                "Body (plain text):",
                bodyText,
                "",
                "Consider: spam-trigger words, all-caps, excessive punctuation, image-to-text ratio (estimate from <img> tag count and body length), broken/empty links, weak subject line, unclear call to action, deliverability red flags. Aim for 3-6 warnings/suggestions combined. Be specific about which part of the email each item refers to.",
                "",
                "Return ONLY this JSON object (no prose, no markdown):",
                '{"score": <0-100>, "summary": "<one sentence>", "warnings": [{"severity": "high|medium|low", "message": "..."}], "suggestions": [{"area": "subject|content|deliverability|structure", "message": "..."}]}',
            ].join("\n"),
        },
    ];

    try {
        const result = await chatJson<CampaignReview>(messages, {
            brandId: campaign.brandId,
            temperature: 0.3,
            maxTokens: 1500,
            timeoutMs: 60_000,
        });

        return {
            score: typeof result.score === "number" ? Math.max(0, Math.min(100, Math.round(result.score))) : 50,
            summary: typeof result.summary === "string" ? result.summary : "",
            warnings: Array.isArray(result.warnings)
                ? result.warnings.filter((w) => w && typeof w.message === "string").slice(0, 10)
                : [],
            suggestions: Array.isArray(result.suggestions)
                ? result.suggestions.filter((s) => s && typeof s.message === "string").slice(0, 10)
                : [],
        };
    } catch (err) {
        if (err instanceof AiUnavailableError) throw new Error(aiErrorMessage(err.reason));
        throw err;
    }
}

export async function reviewCampaignDraft(input: {
    brandId: string;
    subject: string;
    html: string;
}): Promise<CampaignReview> {
    const brand = await requireBrandAccess(input.brandId);
    const bodyText = htmlToText(input.html || "", { wordwrap: false }).slice(0, 6000);

    if (!bodyText.trim()) throw new Error("Email body is empty — write some content before running review.");

    const messages = [
        {
            role: "system" as const,
            content: [
                "You are a JSON-only proofreading API. You return one JSON object and nothing else.",
                "",
                "You report mechanical errors only: grammar, spelling, punctuation, capitalization of proper nouns, citation/reference errors, truncated sentences, and inconsistent terminology.",
                "",
                "Citation/reference verification is a primary task. For every chapter:verse reference (e.g. 'John 3:16', 'Romans 8:28', 'Psalm 23:1'):",
                "  1. Confirm the book name is spelled correctly.",
                "  2. Confirm the chapter and verse numbers exist in that book.",
                "  3. If the email quotes text near the reference, check whether the quoted text matches what that specific chapter:verse actually says in common translations (KJV, NIV, ESV). If the quoted text is famously associated with a DIFFERENT verse, flag the reference as wrong and name the correct one.",
                "Examples worth flagging: a famous quote paired with an adjacent-but-wrong verse number; a real book paired with a chapter/verse that doesn't exist; a misspelled book name. For citation/reference errors, do not require 'high confidence' — if you have a reasonable belief the reference is wrong, report it with severity 'medium' and explain.",
                "",
                "You never comment on tone, voice, preachiness, warmth, persuasiveness, theology, doctrinal positions, message content, call-to-action presence, subject line appeal, deliverability, spam likelihood, or stylistic rewording. The author's viewpoint is not your concern.",
                "",
                "If you find no mechanical errors, return empty arrays.",
            ].join("\n"),
        },
        {
            role: "user" as const,
            content: [
                `Subject: ${input.subject || "(none yet)"}`,
                "",
                "Body (plain text):",
                bodyText,
                "",
                "Return ONLY this JSON object (no prose, no markdown):",
                '{"score": <0-100, 100=no errors>, "summary": "<one sentence stating the count and type of errors found, or that none were found>", "warnings": [{"severity": "high|medium|low", "message": "<quote the wrong phrase or reference, then state the correction>"}], "suggestions": [{"area": "subject|content|deliverability|structure", "message": "<quote the wrong phrase or reference, then state the correction>"}]}',
            ].join("\n"),
        },
    ];

    try {
        const result = await chatJson<CampaignReview>(messages, {
            brandId: input.brandId,
            temperature: 0.2,
            maxTokens: 1500,
            timeoutMs: 60_000,
        });

        return {
            score: typeof result.score === "number" ? Math.max(0, Math.min(100, Math.round(result.score))) : 50,
            summary: typeof result.summary === "string" ? result.summary : "",
            warnings: Array.isArray(result.warnings)
                ? result.warnings.filter((w) => w && typeof w.message === "string").slice(0, 10)
                : [],
            suggestions: Array.isArray(result.suggestions)
                ? result.suggestions.filter((s) => s && typeof s.message === "string").slice(0, 10)
                : [],
        };
    } catch (err) {
        if (err instanceof AiUnavailableError) throw new Error(aiErrorMessage(err.reason));
        throw err;
    }
}

export interface CampaignInsights {
    headline: string;
    summary: string;
    score: number;
    strengths: string[];
    risks: string[];
    nextSteps: string[];
}

export async function summarizeCampaignResults(campaignId: string): Promise<CampaignInsights> {
    const campaign = await loadCampaignForBrandAccess(campaignId);
    if (campaign.status !== "sent" && campaign.status !== "sending") {
        throw new Error("Insights are only available for sent campaigns.");
    }

    const [totalSent, totalOpened, totalClicked, totalBounced, totalComplained] = await Promise.all([
        prisma.campaignSend.count({ where: { campaignId, status: "sent" } }),
        prisma.campaignSend.count({ where: { campaignId, openedAt: { not: null } } }),
        prisma.campaignSend.count({ where: { campaignId, clickedAt: { not: null } } }),
        prisma.campaignSend.count({ where: { campaignId, status: "bounced" } }),
        prisma.campaignSend.count({ where: { campaignId, status: "complained" } }),
    ]);

    if (totalSent === 0) throw new Error("No emails have been delivered yet — no data to analyze.");

    const openRate = (totalOpened / totalSent) * 100;
    const clickRate = (totalClicked / totalSent) * 100;
    const ctor = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = ((totalBounced) / (totalSent + totalBounced)) * 100;
    const complaintRate = (totalComplained / totalSent) * 100;

    const messages = [
        {
            role: "system" as const,
            content:
                "You analyze email campaign performance for marketers. Be honest, specific, and concrete. Industry baselines: 20-25% open, 2-5% click, 10-15% CTOR, <0.5% bounce, <0.1% complaint. Return JSON only.",
        },
        {
            role: "user" as const,
            content: [
                `Subject: ${campaign.subject}`,
                "",
                "Stats:",
                `- Delivered: ${totalSent}`,
                `- Open rate: ${openRate.toFixed(1)}%`,
                `- Click rate: ${clickRate.toFixed(1)}%`,
                `- CTOR: ${ctor.toFixed(1)}%`,
                `- Bounce rate: ${bounceRate.toFixed(2)}%`,
                `- Complaint rate: ${complaintRate.toFixed(3)}%`,
                "",
                'Return JSON: {"headline": "one-line verdict", "summary": "2-3 sentence narrative", "score": 0-100, "strengths": [".."], "risks": [".."], "nextSteps": [".."]}',
                "Each list should have 1-4 items. Be specific to these numbers, not generic.",
            ].join("\n"),
        },
    ];

    try {
        const result = await chatJson<CampaignInsights>(messages, {
            brandId: campaign.brandId,
            temperature: 0.5,
            maxTokens: 1200,
        });

        return {
            headline: typeof result.headline === "string" ? result.headline : "Campaign analyzed",
            summary: typeof result.summary === "string" ? result.summary : "",
            score: typeof result.score === "number" ? Math.max(0, Math.min(100, Math.round(result.score))) : 50,
            strengths: Array.isArray(result.strengths) ? result.strengths.filter((s) => typeof s === "string").slice(0, 5) : [],
            risks: Array.isArray(result.risks) ? result.risks.filter((s) => typeof s === "string").slice(0, 5) : [],
            nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps.filter((s) => typeof s === "string").slice(0, 5) : [],
        };
    } catch (err) {
        if (err instanceof AiUnavailableError) throw new Error(aiErrorMessage(err.reason));
        throw err;
    }
}

type RawBlock = { type?: string; props?: Record<string, unknown> };

function normalizeBlock(raw: RawBlock): (EmailBlock & { id: string }) | null {
    if (!raw || typeof raw !== "object" || typeof raw.type !== "string") return null;
    const props = (raw.props && typeof raw.props === "object" ? raw.props : {}) as Record<string, unknown>;
    const id = randomUUID();

    switch (raw.type) {
        case "heading": {
            const content = typeof props.content === "string" ? props.content : "Headline";
            const level = props.level === 1 || props.level === 2 || props.level === 3 ? props.level : 2;
            const align = props.align === "center" || props.align === "right" ? props.align : "left";
            return { id, type: "heading", props: { content, level, align } };
        }
        case "text": {
            const content = typeof props.content === "string" ? sanitizeEmailHtml(props.content) : "";
            if (!content.trim()) return null;
            const align = props.align === "center" || props.align === "right" ? props.align : "left";
            return { id, type: "text", props: { content, align } };
        }
        case "image": {
            const src = typeof props.src === "string" ? props.src : "";
            if (!src) return null;
            return {
                id,
                type: "image",
                props: {
                    src,
                    alt: typeof props.alt === "string" ? props.alt : "",
                    href: typeof props.href === "string" ? props.href : undefined,
                    align: props.align === "left" || props.align === "right" ? props.align : "center",
                    width: typeof props.width === "number" ? props.width : undefined,
                },
            };
        }
        case "button": {
            const text = typeof props.text === "string" && props.text.trim() ? props.text : "Learn more";
            const href = typeof props.href === "string" && props.href ? props.href : "#";
            return {
                id,
                type: "button",
                props: {
                    text,
                    href,
                    align: props.align === "left" || props.align === "right" ? props.align : "center",
                    bgColor: typeof props.bgColor === "string" ? props.bgColor : undefined,
                    textColor: typeof props.textColor === "string" ? props.textColor : undefined,
                },
            };
        }
        case "divider":
            return { id, type: "divider", props: {} };
        case "spacer":
            return {
                id,
                type: "spacer",
                props: { height: typeof props.height === "number" ? props.height : 24 },
            };
        default:
            return null;
    }
}

export async function generateEmailFromPrompt(input: {
    brandId: string;
    prompt: string;
    tone?: string;
}): Promise<{ document: BlockEmailDocument; html: string; suggestedSubject?: string }> {
    await requireBrandAccess(input.brandId);
    const promptText = input.prompt.trim();
    if (!promptText) throw new Error("Describe what the email should be about.");
    if (promptText.length > 2000) throw new Error("Prompt is too long. Keep it under 2000 characters.");

    const messages = [
        {
            role: "system" as const,
            content: [
                "You design email newsletters as a structured block document.",
                "Output JSON only. Use ONLY these block types:",
                '- {"type":"heading","props":{"content":"text","level":1|2|3,"align":"left"|"center"|"right"}}',
                '- {"type":"text","props":{"content":"<p>HTML with <strong>, <em>, <a href=\\"\\">, <ul>, <li> only</p>","align":"left"|"center"|"right"}}',
                '- {"type":"image","props":{"src":"https://...","alt":"...","href":"https://...","align":"center","width":480}} — only include if you have a real public image URL; otherwise skip image blocks',
                '- {"type":"button","props":{"text":"...","href":"https://...","align":"center","bgColor":"#hex","textColor":"#hex"}}',
                '- {"type":"divider","props":{}}',
                '- {"type":"spacer","props":{"height":24}}',
                "",
                "Rules:",
                "- 4-8 blocks total. Start with a heading. End with a button OR a sign-off text block.",
                "- Never invent image URLs — only use real public ones; if unsure, skip images.",
                "- Use [Name] as a placeholder for the recipient's name where appropriate.",
                "- Include an unsubscribe note in the final text block: \"You're receiving this because you subscribed. [Unsubscribe]\".",
                "- Keep copy concise and scannable.",
            ].join("\n"),
        },
        {
            role: "user" as const,
            content: [
                `Brief: ${promptText}`,
                input.tone ? `Tone: ${input.tone}` : "",
                "",
                'Return JSON with this shape exactly: {"subject": "suggested subject line", "blocks": [ ... ]}',
            ].filter(Boolean).join("\n"),
        },
    ];

    try {
        const result = await chatJson<{ subject?: string; blocks?: RawBlock[] }>(messages, {
            brandId: input.brandId,
            temperature: 0.8,
            maxTokens: 3000,
            timeoutMs: 60_000,
        });

        const rawBlocks = Array.isArray(result.blocks) ? result.blocks : [];
        const normalized = rawBlocks
            .map(normalizeBlock)
            .filter((b): b is EmailBlock & { id: string } => b !== null);

        if (normalized.length < 2) {
            throw new Error("AI returned too few valid blocks. Try a more specific prompt.");
        }

        const document: BlockEmailDocument = { blocks: normalized, settings: {} };
        const html = compileBlocksToHtml(document);

        return {
            document,
            html,
            suggestedSubject: typeof result.subject === "string" ? result.subject : undefined,
        };
    } catch (err) {
        if (err instanceof AiUnavailableError) throw new Error(aiErrorMessage(err.reason));
        throw err;
    }
}

export async function generateSubjectLines(input: {
    brandId: string;
    bodyHtml: string;
    currentSubject?: string;
    audienceHint?: string;
}): Promise<{ suggestions: string[] }> {
    await requireBrandAccess(input.brandId);

    const bodyText = htmlToText(input.bodyHtml || "", { wordwrap: false }).slice(0, 4000);
    if (!bodyText.trim()) {
        throw new Error("Email body is empty — write some content before generating subject lines.");
    }

    const messages = [
        {
            role: "system" as const,
            content:
                "You write high-performing email subject lines. Respect deliverability best practices: no all-caps, no spammy phrases, no excessive punctuation, no misleading content. Keep each subject line under 70 characters. Match the tone of the email body. Return JSON only.",
        },
        {
            role: "user" as const,
            content: [
                `Generate 5 subject line options for the following email.`,
                input.currentSubject ? `Current subject (for reference, may be weak): ${input.currentSubject}` : "",
                input.audienceHint ? `Audience: ${input.audienceHint}` : "",
                "",
                "Email body (plain text):",
                bodyText,
                "",
                `Return JSON in this exact shape: {"suggestions": ["...", "...", "...", "...", "..."]}`,
            ].filter(Boolean).join("\n"),
        },
    ];

    try {
        const result = await chatJson<{ suggestions: unknown }>(messages, {
            brandId: input.brandId,
            temperature: 0.9,
            maxTokens: 600,
        });
        const suggestions = Array.isArray(result?.suggestions)
            ? result.suggestions.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 5)
            : [];
        if (suggestions.length === 0) throw new Error("No subject lines returned.");
        return { suggestions };
    } catch (err) {
        if (err instanceof AiUnavailableError) throw new Error(aiErrorMessage(err.reason));
        throw err;
    }
}
