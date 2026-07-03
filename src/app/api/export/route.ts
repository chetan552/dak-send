import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listId = req.nextUrl.searchParams.get("listId");
    if (!listId) {
        return NextResponse.json({ error: "Missing listId" }, { status: 400 });
    }

    const whereCondition: any = currentUserRole === 'admin'
        ? { id: listId }
        : { id: listId, brand: { users: { some: { id: userId } } } };

    const list = await prisma.list.findFirst({
        where: whereCondition,
        include: { customFields: true }
    });

    if (!list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const subscribers = await prisma.subscriber.findMany({
        where: { listId },
        include: {
            customFields: {
                include: { customField: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Build CSV
    const customFieldNames = list.customFields.map((cf: any) => cf.name);
    const headers = ["Email", "Name", "Status", "GDPR Consent", "Created At", ...customFieldNames];

    const rows = subscribers.map(sub => {
        const cfValues = customFieldNames.map(cfName => {
            const cfv = sub.customFields.find(v => v.customField.name === cfName);
            return cfv ? cfv.value : "";
        });

        return [
            sub.email,
            sub.name || "",
            sub.status,
            sub.hasConfirmedGdpr ? "Yes" : "No",
            sub.createdAt.toISOString(),
            ...cfValues
        ];
    });

    // Neutralize CSV/formula injection: a cell whose value begins with =, +, -, @,
    // or a control char is interpreted as a formula by Excel/Sheets. Subscriber
    // name/email/custom fields are attacker-controlled via the public signup form,
    // so prefix any such value with a single quote before quoting the cell.
    const escapeCsvCell = (value: unknown): string => {
        let cell = String(value);
        if (/^[=+\-@\t\r]/.test(cell)) {
            cell = "'" + cell;
        }
        return `"${cell.replace(/"/g, '""')}"`;
    };

    const csvContent = [
        headers.map(escapeCsvCell).join(","),
        ...rows.map(row => row.map(escapeCsvCell).join(","))
    ].join("\n");

    writeAuditLog({
        action: "data_exported",
        entityType: "subscriber",
        entityId: listId,
        actorId: userId,
        actorIp: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined,
        meta: { listId, listName: list.name, count: subscribers.length },
    });

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${list.name.replace(/[^a-zA-Z0-9]/g, '_')}_subscribers.csv"`,
        }
    });
}
