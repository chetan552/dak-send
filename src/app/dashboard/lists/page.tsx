import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function GlobalListsPage() {
    const session = await getServerSession(authOptions);

    const currentUserRole = session?.user?.role || "user";

    const lists = await prisma.list.findMany({
        where: currentUserRole === 'admin'
            ? undefined
            : { brand: { users: { some: { id: session?.user?.id } } } },
        include: {
            brand: true,
            _count: {
                select: { subscribers: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1">Your Lists</h1>
                    <p className="page-subtitle">Manage all your mailing lists across all your brands.</p>
                </div>
            </div>

            {lists.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No lists found"
                    description="You haven't created any mailing lists yet. Go to a Brand's page to create one."
                    action={
                        <Link href="/dashboard">
                            <Button variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2">
                                View Brands <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lists.map((list, i) => (
                        <Card key={list.id} className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                                    <Link href={`/dashboard/lists/${list.id}`} className="flex items-center justify-between w-full">
                                        {list.name}
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </CardTitle>
                                <CardDescription className="text-zinc-500 flex items-center gap-2 truncate">
                                    <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 flex-shrink-0" /> <span className="truncate">Brand: {list.brand.name}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-semibold text-zinc-900 dark:text-white">{list._count.subscribers}</span>
                                        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Subscribers</span>
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
