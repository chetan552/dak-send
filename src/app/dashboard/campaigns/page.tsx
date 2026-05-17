import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Send, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignsView } from "@/components/campaign/campaigns-view";

export default async function CampaignsPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const currentUserRole = session?.user?.role || "user";

    const campaigns = await prisma.campaign.findMany({
        where: currentUserRole === 'admin'
            ? undefined
            : { brand: { users: { some: { id: userId } } } },
        include: {
            brand: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    const sendingCount = campaigns.filter(c => c.status === 'sending').length;
    const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length;

    const metaBits: string[] = [];
    if (campaigns.length) metaBits.push(`${campaigns.length} total`);
    if (sendingCount) metaBits.push(`${sendingCount} sending`);
    if (scheduledCount) metaBits.push(`${scheduledCount} scheduled`);

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Campaigns"
                description="Design and dispatch perfect email campaigns."
                meta={metaBits.length > 0 && <span className="chip">{metaBits.join(" · ")}</span>}
                action={
                    <Link href="/dashboard/campaigns/new">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> Create Campaign
                        </Button>
                    </Link>
                }
            />

            {campaigns.length === 0 ? (
                <EmptyState
                    icon={Send}
                    title="No campaigns yet"
                    description="Craft a beautiful email and send it to your audience."
                    action={
                        <Link href="/dashboard/campaigns/new">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> Draft first campaign
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <CampaignsView campaigns={campaigns} />
            )}
        </div>
    );
}
