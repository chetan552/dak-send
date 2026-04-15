import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { BuilderClient } from "./builder-client";
import type { BlockEmailDocument } from "@/lib/blocks-to-html";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    if (!userId) redirect("/login");

    const whereCondition: any = currentUserRole === "admin"
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };

    const campaign = await prisma.campaign.findFirst({ where: whereCondition });
    if (!campaign) notFound();
    if (campaign.status !== "draft") redirect(`/dashboard/campaigns/${id}`);

    return (
        <BuilderClient
            campaignId={id}
            campaignName={campaign.name}
            initialDoc={(campaign.contentJson as BlockEmailDocument | null) ?? null}
        />
    );
}
