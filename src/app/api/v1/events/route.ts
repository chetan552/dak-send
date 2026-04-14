import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/app/api/v1/_auth";
import { prisma } from "@/lib/prisma";
import { enrollSubscriber } from "@/app/actions/automation";

/**
 * POST /api/v1/events
 *
 * Track an arbitrary event for a subscriber and automatically enroll them
 * in any active automations that listen for that event name.
 *
 * Body:
 *   email    {string}  required — subscriber email
 *   listId   {string}  required — identifies which brand/list context
 *   event    {string}  required — event name, e.g. "placed_order"
 *   properties {object} optional — arbitrary key/value metadata
 *   occurredAt {string} optional — ISO datetime (defaults to now)
 */
export async function POST(req: NextRequest) {
    const authError = await requireApiKey(req);
    if (authError) return authError;

    let body: Record<string, any>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    const listId = body.listId?.trim();
    const eventName = body.event?.trim();
    const properties = body.properties && typeof body.properties === "object" ? body.properties : {};
    const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (!listId) {
        return NextResponse.json({ error: "listId is required." }, { status: 400 });
    }
    if (!eventName) {
        return NextResponse.json({ error: "event name is required." }, { status: 400 });
    }

    // Resolve list → brand
    const list = await prisma.list.findUnique({
        where: { id: listId },
        select: { brandId: true },
    });
    if (!list) {
        return NextResponse.json({ error: "List not found." }, { status: 404 });
    }
    const brandId = list.brandId;

    // Resolve subscriber (may not exist in this list; that's ok — we still record the event)
    const subscriber = await prisma.subscriber.findUnique({
        where: { email_listId: { email, listId } },
        select: { id: true },
    });

    if (!subscriber) {
        return NextResponse.json({ error: "Subscriber not found in this list." }, { status: 404 });
    }

    // Record the event
    const subscriberEvent = await prisma.subscriberEvent.create({
        data: {
            brandId,
            subscriberId: subscriber.id,
            name: eventName,
            properties,
            occurredAt,
        },
    });

    // Find all active automations for this brand that trigger on this event name
    const matchingAutomations = await prisma.automation.findMany({
        where: {
            brandId,
            trigger: "event",
            triggerEventName: eventName,
            status: "active",
        },
        select: { id: true },
    });

    const enrollments: string[] = [];
    for (const automation of matchingAutomations) {
        const enrollment = await enrollSubscriber(automation.id, email, subscriber?.id);
        if (enrollment) enrollments.push(enrollment.id);
    }

    return NextResponse.json({
        success: true,
        eventId: subscriberEvent.id,
        automationsTriggered: matchingAutomations.length,
        enrollmentIds: enrollments,
    });
}
