"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addSubscriberAction } from "@/app/actions/subscriber";
import { useRouter } from "next/navigation";

interface CustomField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options: string | null;
}

interface AddSubscriberButtonProps {
    listId: string;
    requireGdpr?: boolean;
    customFields?: CustomField[];
}

export function AddSubscriberButton({ listId, requireGdpr = false, customFields = [] }: AddSubscriberButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter();

    async function action(formData: FormData) {
        try {
            setLoading(true);
            formData.append("listId", listId);

            if (requireGdpr) {
                const gdprConsent = formData.get("gdpr");
                if (gdprConsent !== "on") {
                    throw new Error("You must confirm that this subscriber has provided explicit GDPR consent.");
                }
            }

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

            await addSubscriberAction(formData);
            setSuccess("Subscriber added successfully");
            router.refresh();

            setTimeout(() => {
                setOpen(false);
                setSuccess("");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to add subscriber");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
                    <UserPlus className="h-4 w-4" />
                    Add Subscriber
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Subscriber</DialogTitle>
                    <DialogDescription>
                        Manually add a new subscriber to this list.
                    </DialogDescription>
                </DialogHeader>
                <form action={action} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="joe@example.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                        <Input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="Joe Bloggs"
                        />
                    </div>

                    {customFields.length > 0 && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Custom Fields</h4>
                            {customFields.map((cf) => (
                                <div key={cf.id} className="space-y-2">
                                    <Label htmlFor={`cf_${cf.id}`}>
                                        {cf.name} {cf.required && <span className="text-red-500">*</span>}
                                    </Label>

                                    {cf.type === 'select' ? (
                                        <Select name={`cf_${cf.id}`} required={cf.required}>
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
                                            placeholder={`Enter ${cf.name.toLowerCase()}`}
                                            required={cf.required}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {requireGdpr && (
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                            <div className="flex items-start space-x-2">
                                <Checkbox id="gdpr" name="gdpr" required />
                                <div className="grid gap-1.5 leading-none">
                                    <Label
                                        htmlFor="gdpr"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        GDPR Consent Required
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        I confirm that this subscriber has provided explicit consent to receive emails and agrees to the privacy policy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 text-center font-medium pt-2">{error}</p>}
                    {success && <p className="text-sm text-green-500 text-center font-medium pt-2">{success}</p>}

                    <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Subscriber
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
