"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateSubscriberAction } from "@/app/actions/subscriber";

interface CustomField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options: string | null;
}

interface EditSubscriberDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    listId: string;
    customFields?: CustomField[];
    subscriber: any;
}

export function EditSubscriberDialog({ open, setOpen, listId, customFields = [], subscriber }: EditSubscriberDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Helper to get default value for a specific custom field
    const getDefaultCustomFieldValue = (customFieldId: string) => {
        if (!subscriber.customFields) return "";
        const match = subscriber.customFields.find((cfv: any) => cfv.customFieldId === customFieldId);
        return match ? match.value : "";
    };

    async function action(formData: FormData) {
        try {
            setLoading(true);
            formData.append("listId", listId);
            formData.append("subscriberId", subscriber.id);

            const customFieldsData: Record<string, string> = {};
            for (const field of customFields) {
                const val = formData.get(`cf_${field.id}`);
                if (val) {
                    customFieldsData[field.id] = String(val);
                }
            }
            formData.append("customFieldsJson", JSON.stringify(customFieldsData));

            setError("");
            setSuccess("");

            await updateSubscriberAction(formData);
            setSuccess("Subscriber updated successfully");

            setTimeout(() => {
                setOpen(false);
                setSuccess("");
            }, 1000);
        } catch (err: any) {
            setError(err.message || "Failed to update subscriber");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Subscriber</DialogTitle>
                    <DialogDescription>
                        Update details and custom fields for this subscriber.
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={subscriber.email}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            defaultValue={subscriber.name || ""}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="status">Subscription Status <span className="text-red-500">*</span></Label>
                        <Select name="status" defaultValue={subscriber.status || 'subscribed'} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="subscribed">Subscribed</SelectItem>
                                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                                <SelectItem value="bounced">Bounced</SelectItem>
                                <SelectItem value="complained">Complained</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {customFields.length > 0 && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Custom Fields</h4>
                            {customFields.map((cf) => {
                                const defaultValue = getDefaultCustomFieldValue(cf.id);
                                return (
                                    <div key={cf.id} className="space-y-2">
                                        <Label htmlFor={`cf_${cf.id}`}>
                                            {cf.name} {cf.required && <span className="text-red-500">*</span>}
                                        </Label>

                                        {cf.type === 'select' ? (
                                            <Select name={`cf_${cf.id}`} defaultValue={defaultValue} required={cf.required}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={`Select ${cf.name.toLowerCase()}`} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {cf.options?.split(',').map((opt: string) => (
                                                        <SelectItem key={opt.trim()} value={opt.trim()}>
                                                            {opt.trim()}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id={`cf_${cf.id}`}
                                                name={`cf_${cf.id}`}
                                                type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                                                defaultValue={defaultValue}
                                                required={cf.required}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 text-center font-medium pt-2">{error}</p>}
                    {success && <p className="text-sm text-green-500 text-center font-medium pt-2">{success}</p>}

                    <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
