import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CreateListButton } from "@/components/list/create-list-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users2, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandSettingsButton } from "@/components/brand/brand-settings-button";
import { DeleteBrandButton } from "@/components/brand/delete-brand-button";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserRole = session?.user?.role || "user";
    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, users: { some: { id: session?.user?.id } } };

    const brand = await prisma.brand.findFirst({
        where: whereCondition,
        include: {
            lists: {
                include: {
                    _count: { select: { subscribers: true } }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!brand) {
        notFound();
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Brands
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title mb-1">{brand.name}</h1>
                    <p className="page-subtitle">Manage all mailing lists associated with this brand.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {currentUserRole === 'admin' && <DeleteBrandButton brandId={brand.id} brandName={brand.name} />}
                    <BrandSettingsButton brand={brand} />
                    <CreateListButton brandId={brand.id} />
                </div>
            </div>

            {brand.lists.length === 0 ? (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <Users2 className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No lists yet</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">Create a mailing list to start collecting subscribers.</p>
                        <CreateListButton brandId={brand.id} />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {brand.lists.map((list, i) => (
                        <Card key={list.id} className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    <Link href={`/dashboard/lists/${list.id}`} className="flex items-center justify-between w-full">
                                        {list.name}
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </CardTitle>
                                <CardDescription className="text-zinc-500">Created {new Date(list.createdAt).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-3xl font-semibold text-zinc-900 dark:text-white">{list._count.subscribers}</span>
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
