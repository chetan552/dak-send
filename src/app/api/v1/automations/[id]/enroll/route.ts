import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/app/api/v1/_auth";
import { prisma } from "@/lib/prisma";
import { enrollSubscriber } from "@/app/actions/automation";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    const { id } = await params;

    const automation = await prisma.automation.findUnique({
        where: { id },
        select: { id: true, status: true, trigger: true },
    });

    if (!automation || automation.trigger !== "api") {
        return NextResponse.json({ error: "Automation not found or not an API-triggered automation." }, { status: 404 });
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

    const subscriber = await prisma.subscriber.findFirst({
        where: { email, list: { brand: { automations: { some: { id } } } } },
        select: { id: true },
    });

    const enrollment = await enrollSubscriber(id, email, subscriber?.id);

    if (!enrollment) {
        return NextResponse.json({ error: "Automation has no steps." }, { status: 422 });
    }

    return NextResponse.json({ success: true, enrollmentId: enrollment.id }, { status: 200 });
}
