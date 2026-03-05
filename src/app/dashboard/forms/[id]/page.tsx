import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSignupFormById } from "@/app/actions/signup-form";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/forms/form-builder";
import { ArrowLeft, FileInput, Eye, MousePointerClick } from "lucide-react";
import Link from "next/link";

export default async function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    const form = await getSignupFormById(id);
    if (!form) return notFound();

    const conversionRate = form.views > 0
        ? ((form.submissions / form.views) * 100).toFixed(1)
        : "0.0";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
                <Link href="/dashboard/forms" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                </Link>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                        <FileInput className="w-7 h-7 text-teal-500" />
                        {form.name}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {form.brand?.name} · {form.list?.name}
                    </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <Eye className="w-4 h-4" />
                        <span>{form.views.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <MousePointerClick className="w-4 h-4" />
                        <span>{form.submissions.toLocaleString()} subs</span>
                    </div>
                    <div className="text-teal-600 dark:text-teal-400 font-medium">
                        {conversionRate}% CVR
                    </div>
                </div>
            </div>

            <FormBuilder form={form} appUrl={appUrl} />
        </div>
    );
}
