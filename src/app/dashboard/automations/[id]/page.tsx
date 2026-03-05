import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAutomation } from "@/app/actions/automation";
import { AutomationBuilder } from "@/components/automation/automation-builder";

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    let automation;
    try {
        automation = await getAutomation(id);
    } catch {
        notFound();
    }

    const statusColors: Record<string, string> = {
        draft: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
        active: "bg-green-500/10 text-green-600 dark:text-green-400",
        paused: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500",
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/automations" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Automations
                </Link>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                        <Zap className="w-7 h-7 text-yellow-500" />
                        {automation.name}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {automation.brand.name} • Created {new Date(automation.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[automation.status] || ""}`}>
                    {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                </span>
            </div>

            <AutomationBuilder automation={automation} />
        </div>
    );
}
