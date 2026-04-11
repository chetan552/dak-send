import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ImportCsvButton } from "@/components/subscriber/import-csv-button";
import { Card, CardContent } from "@/components/ui/card";
import { Users2, ArrowLeft, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListSettingsForm } from "@/components/subscriber/list-settings-form";
import { CustomFieldsManager } from "@/components/subscriber/custom-fields-manager";
import { SegmentsManager } from "@/components/subscriber/segments-manager";
import { EmbedForm } from "@/components/campaign/embed-form";
import { AddSubscriberButton } from "@/components/subscriber/add-subscriber-button";
import { SubscribersTable } from "@/components/subscriber/subscribers-table";
import { ExportSubscribersButton } from "@/components/subscriber/export-button";
import { EngagementSegmentsButton } from "@/components/subscriber/engagement-segments-button";

export default async function ListPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const pageParam = resolvedSearchParams?.page;
    const currentPage = typeof pageParam === 'string' ? parseInt(pageParam, 10) : 1;
    const SUBSCRIBERS_PER_PAGE = 50;

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const currentUserRole = session?.user?.role || "user";
    const whereCondition: any = currentUserRole === 'admin'
        ? { id }
        : { id, brand: { users: { some: { id: userId } } } };
    const totalSubscribers = await prisma.subscriber.count({
        where: { listId: id }
    });

    const totalPages = Math.ceil(totalSubscribers / Math.max(1, SUBSCRIBERS_PER_PAGE));
    const validCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));

    const list = (await prisma.list.findFirst({
        where: whereCondition,
        include: {
            brand: true,
            customFields: true,
            segments: true,
            subscribers: {
                orderBy: { createdAt: 'desc' },
                skip: (validCurrentPage - 1) * SUBSCRIBERS_PER_PAGE,
                take: SUBSCRIBERS_PER_PAGE,
                include: { customFields: true } // Fetch subscriber's custom field values
            }
        }
    })) as any;

    if (!list) {
        notFound();
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href={`/dashboard/brands/${list.brandId}`} className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to {list.brand.name}
                </Link>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white break-words">{list.name}</h1>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">{totalSubscribers} Subscribers</span>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">View and manage your subscribers for this list.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <EngagementSegmentsButton listId={list.id} />
                    <ExportSubscribersButton listId={list.id} />
                    <EmbedForm listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                    <AddSubscriberButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                    <ImportCsvButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                </div>
            </div>

            <Tabs defaultValue="subscribers" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
                    <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
                    <TabsTrigger value="segments">Segments</TabsTrigger>
                    <TabsTrigger value="settings">List Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="subscribers" className="space-y-4">
                    {totalSubscribers === 0 ? (
                        <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                            <CardContent className="flex flex-col items-center justify-center p-16 text-center animate-in fade-in duration-700">
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                                    <Mail className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">This list is empty</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md">You haven't added any subscribers to this list yet. Import a CSV file or add a subscriber to get started.</p>
                                <div className="flex items-center gap-3 justify-center">
                                    <AddSubscriberButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                                    <ImportCsvButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <SubscribersTable
                                listId={list.id}
                                subscribers={list.subscribers}
                                customFields={list.customFields}
                                currentPage={validCurrentPage}
                                totalPages={totalPages}
                            />
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="custom-fields">
                    <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Custom Fields</h2>
                        <CustomFieldsManager listId={list.id} customFields={list.customFields} />
                    </Card>
                </TabsContent>

                <TabsContent value="segments">
                    <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Segments</h2>
                        <SegmentsManager listId={list.id} segments={list.segments} customFields={list.customFields} />
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">List Settings</h2>
                        <ListSettingsForm list={list} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
