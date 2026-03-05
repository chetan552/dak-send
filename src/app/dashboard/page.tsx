import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CreateBrandButton } from "@/components/brand/create-brand-button";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role || "user";

    const brands = await prisma.brand.findMany({
        where: currentUserRole === 'admin'
            ? undefined
            : { users: { some: { id: (session?.user as any)?.id } } },
        include: {
            _count: {
                select: { lists: true, campaigns: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Your Brands</h1>
                    <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Manage your sender identities and client brands.</p>
                </div>
                {currentUserRole === 'admin' && <CreateBrandButton />}
            </div>

            {brands.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No brands yet</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">Create your first brand to start managing subscriber lists and sending beautiful campaigns.</p>
                        {currentUserRole === 'admin' && <CreateBrandButton />}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {brands.map((brand, i) => (
                        <Card key={brand.id} className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                            <CardHeader className="pb-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-4">
                                    <span className="font-bold text-zinc-900 dark:text-white text-lg">{brand.name[0]?.toUpperCase()}</span>
                                </div>
                                <CardTitle className="text-xl text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    <Link href={`/dashboard/brands/${brand.id}`} className="flex items-center justify-between w-full">
                                        {brand.name}
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </CardTitle>
                                <CardDescription className="text-zinc-500 truncate">{brand.fromEmail || 'No sender email configured'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-semibold text-zinc-900 dark:text-white">{brand._count.lists}</span>
                                        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Lists</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-semibold text-zinc-900 dark:text-white">{brand._count.campaigns}</span>
                                        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Campaigns</span>
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
