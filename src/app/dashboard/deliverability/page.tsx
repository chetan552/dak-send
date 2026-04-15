import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDeliverabilityStats, getSuppressions } from "@/app/actions/suppression";
import { DeliverabilityClient } from "./deliverability-client";

export default async function DeliverabilityPage() {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role || "user";

    const [{ stats, recentIssues }, suppressions] = await Promise.all([
        getDeliverabilityStats(),
        getSuppressions(),
    ]);

    // Brands the user can scope suppressions to
    const brandsWhere = role === "admin"
        ? {}
        : { users: { some: { id: session?.user?.id } } };
    const brands = await prisma.brand.findMany({
        where: brandsWhere,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return (
        <DeliverabilityClient
            stats={stats}
            recentIssues={recentIssues}
            suppressions={suppressions as any}
            brands={brands}
            isAdmin={role === "admin"}
        />
    );
}
