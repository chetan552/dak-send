import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignForm } from "@/components/campaign/campaign-form";

export default async function NewCampaignPage() {
    const session = await getServerSession(authOptions);

    const brands = await prisma.brand.findMany({
        where: { users: { some: { id: session?.user?.id } } },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/campaigns" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Campaigns
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Create Campaign</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Design your perfect email and save it as a draft.</p>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white">Campaign Details</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">Basic information about your email campaign.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CampaignForm brands={brands} />
                </CardContent>
            </Card>
        </div>
    );
}
