import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LayoutTemplate, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllTemplates } from "@/app/actions/templates";
import { TemplateLibrary } from "@/components/template/template-library";

export default async function TemplatesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role || "user";
    const templates = await getAllTemplates();

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                        <LayoutTemplate className="w-7 h-7 text-indigo-500" />
                        Template Library
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                        Browse pre-built templates or save your own. Click any template to use it in a campaign.
                    </p>
                </div>
                <Link href="/dashboard/templates/save">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]">
                        <Plus className="w-4 h-4" /> Save Template
                    </Button>
                </Link>
            </div>

            <TemplateLibrary
                templates={templates}
                currentUserId={userId}
                isAdmin={role === "admin"}
            />
        </div>
    );
}
