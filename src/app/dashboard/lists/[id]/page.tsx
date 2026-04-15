import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ImportCsvButton } from "@/components/subscriber/import-csv-button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListSettingsForm } from "@/components/subscriber/list-settings-form";
import { CustomFieldsManager } from "@/components/subscriber/custom-fields-manager";
import { SegmentsManager } from "@/components/subscriber/segments-manager";
import { AddSubscriberButton } from "@/components/subscriber/add-subscriber-button";
import { SubscribersTable } from "@/components/subscriber/subscribers-table";
import { ListActionsMenu } from "@/components/subscriber/list-actions-menu";
import { DeleteListButton } from "@/components/list/delete-list-button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                breadcrumb={
                    <Link
                        href={`/dashboard/brands/${list.brandId}`}
                        className="hover:text-zinc-900 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to {list.brand.name}
                    </Link>
                }
                title={list.name}
                description="View and manage your subscribers for this list."
                meta={<span className="chip">{totalSubscribers.toLocaleString()} subscribers</span>}
                action={
                    <>
                        <ListActionsMenu
                            listId={list.id}
                            requireGdpr={list.requireGdpr}
                            customFields={list.customFields}
                        />
                        <ImportCsvButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                        <AddSubscriberButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                        <DeleteListButton listId={list.id} listName={list.name} brandId={list.brandId} />
                    </>
                }
            />

            <Tabs defaultValue="subscribers" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
                    <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
                    <TabsTrigger value="segments">Segments</TabsTrigger>
                    <TabsTrigger value="settings">List Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="subscribers" className="space-y-4">
                    {totalSubscribers === 0 ? (
                        <EmptyState
                            icon={Mail}
                            title="This list is empty"
                            description="You haven't added any subscribers to this list yet. Import a CSV file or add a subscriber to get started."
                            action={
                                <div className="flex items-center gap-3 justify-center">
                                    <AddSubscriberButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                                    <ImportCsvButton listId={list.id} requireGdpr={list.requireGdpr} customFields={list.customFields} />
                                </div>
                            }
                        />
                    ) : (
                        <Card className="surface-card overflow-hidden p-0 gap-0 shadow-none">
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
                    <Card className="surface-card p-6 shadow-none">
                        <h2 className="section-title mb-4">Custom Fields</h2>
                        <CustomFieldsManager listId={list.id} customFields={list.customFields} />
                    </Card>
                </TabsContent>

                <TabsContent value="segments">
                    <Card className="surface-card p-6 shadow-none">
                        <h2 className="section-title mb-4">Segments</h2>
                        <SegmentsManager listId={list.id} segments={list.segments} customFields={list.customFields} />
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card className="surface-card p-6 shadow-none">
                        <h2 className="section-title mb-4">List Settings</h2>
                        <ListSettingsForm list={list} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
