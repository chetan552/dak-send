"use client";

import { useTransition, useState } from "react";
import { MoreHorizontal, Trash2, UserMinus, Pencil, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSubscriber, unsubscribeSubscriber, resubscribeSubscriber } from "@/app/actions/subscriber";
import { useRouter } from "next/navigation";
import { EditSubscriberDialog } from "@/components/subscriber/edit-subscriber-dialog";
import { toast } from "sonner";

interface CustomField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options: string | null;
}

interface SubscriberActionsProps {
    subscriber: any;
    listId: string;
    customFields?: CustomField[];
}

export function SubscriberActions({ subscriber, listId, customFields = [] }: SubscriberActionsProps) {
    const [isPending, startTransition] = useTransition();
    const [showEdit, setShowEdit] = useState(false);
    const router = useRouter();

    const handleUnsubscribe = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to manually unsubscribe this user from the list?")) return;

        startTransition(async () => {
            try {
                await unsubscribeSubscriber(subscriber.id, listId);
                router.refresh();
            } catch (error) {
                console.error("Failed to unsubscribe subscriber:", error);
                alert("Failed to unsubscribe. Please try again.");
            }
        });
    };

    const handleResubscribe = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Resubscribe this user? This will set their status back to subscribed and remove any brand-level suppression.")) return;

        startTransition(async () => {
            try {
                const result = await resubscribeSubscriber(subscriber.id, listId);
                if (result.globalSuppression) {
                    toast.warning("Resubscribed, but a global suppression still exists for this email. Go to Deliverability → Suppression List to remove it before sends will reach them.");
                } else {
                    toast.success("Subscriber resubscribed successfully.");
                }
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Failed to resubscribe.");
            }
        });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to completely delete this subscriber? This action cannot be undone.")) return;

        startTransition(async () => {
            try {
                await deleteSubscriber(subscriber.id, listId);
                router.refresh();
            } catch (error) {
                console.error("Failed to delete subscriber:", error);
                alert("Failed to delete subscriber. Please try again.");
            }
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowEdit(true)} disabled={isPending}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit Subscriber</span>
                    </DropdownMenuItem>
                    {subscriber.status === "subscribed" && (
                        <DropdownMenuItem onClick={handleUnsubscribe} disabled={isPending}>
                            <UserMinus className="mr-2 h-4 w-4" />
                            <span>Unsubscribe</span>
                        </DropdownMenuItem>
                    )}
                    {subscriber.status !== "subscribed" && (
                        <DropdownMenuItem onClick={handleResubscribe} disabled={isPending}>
                            <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                            <span className="text-green-600">Resubscribe</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10" disabled={isPending}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Conditionally rendered edit modal outside of dropdown boundaries */}
            <EditSubscriberDialog
                open={showEdit}
                setOpen={setShowEdit}
                subscriber={subscriber}
                listId={listId}
                customFields={customFields}
            />
        </>
    );
}
