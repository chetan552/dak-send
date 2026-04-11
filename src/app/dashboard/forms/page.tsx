import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSignupForms } from "@/app/actions/signup-form";
import { FileInput, Plus, ExternalLink, Eye, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function FormsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const forms = await getSignupForms();

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1 flex items-center gap-3">
                        <FileInput className="w-7 h-7 text-teal-500" />
                        Signup Forms
                    </h1>
                    <p className="page-subtitle">
                        Create embeddable forms and landing pages to grow your lists.
                    </p>
                </div>
                <Link href="/dashboard/forms/new">
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 transition-all shadow-[0_0_20px_rgba(13,148,136,0.3)] hover:shadow-[0_0_25px_rgba(13,148,136,0.5)]">
                        <Plus className="w-4 h-4" /> New Form
                    </Button>
                </Link>
            </div>

            {forms.length === 0 ? (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
                    <CardContent className="py-16 text-center">
                        <FileInput className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No signup forms yet</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                            Create a form to start collecting subscribers with beautiful landing pages.
                        </p>
                        <Link
                            href="/dashboard/forms/new"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" /> Create Form
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {forms.map((form: any, i: number) => {
                        const conversionRate = form.views > 0
                            ? ((form.submissions / form.views) * 100).toFixed(1)
                            : "0.0";
                        return (
                            <Link
                                key={form.id}
                                href={`/dashboard/forms/${form.id}`}
                                className="group animate-in fade-in slide-in-from-bottom-2"
                                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                            >
                                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:shadow-lg hover:border-teal-500/30 transition-all duration-300 h-full">
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                    {form.name}
                                                </h3>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    {form.brand?.name} · {form.list?.name}
                                                </p>
                                            </div>
                                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${form.status === "active"
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-zinc-500/10 text-zinc-500"
                                                }`}>
                                                {form.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 mt-4">
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>{form.views.toLocaleString()} views</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                <MousePointerClick className="w-3.5 h-3.5" />
                                                <span>{form.submissions.toLocaleString()} subs</span>
                                            </div>
                                            <div className="text-xs font-medium text-teal-600 dark:text-teal-400 ml-auto">
                                                {conversionRate}% CVR
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                                            <span className="text-[11px] text-zinc-400 truncate font-mono">/f/{form.slug}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
