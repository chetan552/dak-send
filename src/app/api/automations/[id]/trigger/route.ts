import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { enrollSubscriber } from "@/app/actions/automation";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Validate Bearer token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
    }

    const automation = await prisma.automation.findUnique({
        where: { id },
        select: { id: true, status: true, trigger: true, webhookSecret: true },
    });

    if (!automation || automation.trigger !== "webhook") {
        return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    const secretBuf = Buffer.from(automation.webhookSecret ?? "");
    const tokenBuf = Buffer.from(token);
    const secretValid = secretBuf.length > 0 && secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf);
    if (!secretValid) {
        return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    if (automation.status !== "active") {
        return NextResponse.json({ error: "Automation is not active." }, { status: 422 });
    }

    let body: { email?: string; name?: string } = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    // Find or create subscriber (no list association for webhook trigger)
    const subscriber = await prisma.subscriber.findFirst({
        where: {
            email,
            list: { brand: { automations: { some: { id } } } },
        },
        select: { id: true },
    });

    const enrollment = await enrollSubscriber(id, email, subscriber?.id);

    if (!enrollment) {
        return NextResponse.json({ error: "Automation has no steps." }, { status: 422 });
    }

    const alreadyEnrolled = enrollment.enrolledAt < new Date(Date.now() - 100);
    return NextResponse.json(
        { success: true, enrollmentId: enrollment.id, alreadyEnrolled },
        { status: 200 }
    );
}
