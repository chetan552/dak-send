import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Plus, Play, Pause, FileText, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAutomations } from "@/app/actions/automation";
import { AutomationStatusToggle } from "@/components/automation/status-toggle";

export default async function AutomationsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const automations = await getAutomations();

    const triggerLabels: Record<string, string> = {
        subscriber_added: "Subscriber joins list",
        subscriber_confirmed: "Subscriber confirms opt-in",
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1 flex items-center gap-3">
                        <Zap className="w-7 h-7 text-yellow-500" />
                        Automations
                    </h1>
                    <p className="page-subtitle">
                        Create automated email sequences triggered by subscriber events.
                    </p>
                </div>
                <Link href="/dashboard/automations/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]">
                        <Plus className="w-4 h-4" /> New Automation
                    </Button>
                </Link>
            </div>

            {automations.length === 0 ? (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="py-16 text-center">
                        <Zap className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No automations yet</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-md mx-auto">
                            Create your first drip campaign to automatically send a sequence of emails when subscribers join a list.
                        </p>
                        <Link
                            href="/dashboard/automations/new"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" /> Create Automation
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {automations.map((automation: any, i: number) => (
                        <Card
                            key={automation.id}
                            className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${automation.status === "active"
                                            ? "bg-green-500/10"
                                            : automation.status === "paused"
                                                ? "bg-yellow-500/10"
                                                : "bg-zinc-500/10"
                                            }`}>
                                            {automation.status === "active" ? (
                                                <Play className="w-5 h-5 text-green-500" />
                                            ) : automation.status === "paused" ? (
                                                <Pause className="w-5 h-5 text-yellow-500" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-zinc-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <Link
                                                href={`/dashboard/automations/${automation.id}`}
                                                className="text-lg font-semibold text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            >
                                                {automation.name}
                                            </Link>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                <span>{triggerLabels[automation.trigger] || automation.trigger}</span>
                                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                                <span>{automation.steps.length} steps</span>
                                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {automation._count.enrollments} enrolled
                                                </span>
                                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                                <span>{automation.brand.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${automation.status === "active"
                                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                            : automation.status === "paused"
                                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                                                : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400"
                                            }`}>
                                            {automation.status.charAt(0).toUpperCase() + automation.status.slice(1)}
                                        </span>
                                        {automation.status !== "draft" && (
                                            <AutomationStatusToggle
                                                automationId={automation.id}
                                                currentStatus={automation.status}
                                            />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
