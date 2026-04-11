import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DeliverabilityCard } from "@/components/settings/deliverability-card";

export default async function DeliverabilityPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";

    const brandsWhere: any = currentUserRole === "admin"
        ? undefined
        : { users: { some: { id: userId } } };

    const brands = await prisma.brand.findMany({
        where: brandsWhere,
        select: { id: true, name: true, fromEmail: true },
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/settings" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Settings
                </Link>
            </div>

            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1 flex items-center gap-3">
                    <Shield className="w-7 h-7 text-emerald-500" /> Email Deliverability
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    Check SPF, DKIM, DMARC, and MX records for your sending domains.
                </p>
            </div>

            <div className="space-y-4">
                {brands.filter((b: any) => b.fromEmail).map((brand: any) => (
                    <DeliverabilityCard
                        key={brand.id}
                        brandId={brand.id}
                        brandName={brand.name}
                        domain={brand.fromEmail.split("@")[1]}
                    />
                ))}
            </div>

            {brands.filter((b: any) => b.fromEmail).length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                    <p>No brands with a configured sender email. Set up a sender email on a brand first.</p>
                </div>
            )}

            <div className="bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/20 rounded-lg p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <p className="font-medium mb-1">💡 What these checks mean</p>
                <ul className="list-disc list-inside space-y-1 text-emerald-600/80 dark:text-emerald-400/80">
                    <li><strong>SPF</strong> — Authorizes which servers can send email for your domain</li>
                    <li><strong>DKIM</strong> — Cryptographically signs emails to prove they haven&apos;t been tampered with</li>
                    <li><strong>DMARC</strong> — Tells receiving servers what to do with unauthenticated emails</li>
                    <li><strong>MX</strong> — Mail exchange records for receiving email (important for reply handling)</li>
                </ul>
            </div>
        </div>
    );
}
