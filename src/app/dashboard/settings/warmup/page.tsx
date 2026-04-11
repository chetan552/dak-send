import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Flame, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WarmupCard } from "@/components/settings/warmup-card";

export default async function WarmupPage() {
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
                    <Flame className="w-7 h-7 text-orange-500" /> Domain Warmup
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    Gradually increase your sending volume over 14 days to build domain reputation and avoid spam filters.
                </p>
            </div>

            <div className="space-y-4">
                {brands.filter((b: any) => b.fromEmail).map((brand: any) => (
                    <WarmupCard
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
        </div>
    );
}
