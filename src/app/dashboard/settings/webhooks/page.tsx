import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWebhooks } from "@/app/actions/webhook";
import { prisma } from "@/lib/prisma";
import { WebhooksManager } from "@/components/settings/webhooks-manager";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function WebhooksPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = session.user?.id;
    const role = session.user?.role || "user";

    const webhooks = await getWebhooks();

    const where = role === "admin" ? {} : { users: { some: { id: userId } } };
    const brands = await prisma.brand.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
                <Link href="/dashboard/settings" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Settings
                </Link>
            </div>
            <WebhooksManager webhooks={webhooks} brands={brands} />
        </div>
    );
}
