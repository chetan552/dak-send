"use client";

import { useState } from "react";
import { updateListSettings } from "@/app/actions/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function ListSettingsForm({ list }: { list: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [requireGdpr, setRequireGdpr] = useState(list.requireGdpr || false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        const form = e.currentTarget;
        const data = {
            name: (form.elements.namedItem('name') as HTMLInputElement).value,
            optIn: (form.elements.namedItem('optIn') as HTMLInputElement).value,
            requireGdpr,
            optInConfirmationUrl: (form.elements.namedItem('optInConfirmationUrl') as HTMLInputElement).value,
            unsubscribeConfirmationUrl: (form.elements.namedItem('unsubscribeConfirmationUrl') as HTMLInputElement).value,
            welcomeEmailHtml: (form.elements.namedItem('welcomeEmailHtml') as HTMLTextAreaElement).value,
            goodbyeEmailHtml: (form.elements.namedItem('goodbyeEmailHtml') as HTMLTextAreaElement).value,
        };

        try {
            await updateListSettings(list.id, data);
            alert("Settings updated successfully");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">List Name</Label>
                    <Input id="name" name="name" defaultValue={list.name} required />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="optIn">Opt-In Mode</Label>
                    <Select name="optIn" defaultValue={list.optIn}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select opt-in mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="single">Single Opt-In (Add immediately)</SelectItem>
                            <SelectItem value="double">Double Opt-In (Require email confirmation)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-row items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="space-y-0.5">
                        <Label htmlFor="requireGdpr">Require GDPR Consent</Label>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Enforces strict GDPR rules for data collection.
                        </p>
                    </div>
                    <Switch id="requireGdpr" checked={requireGdpr} onCheckedChange={setRequireGdpr} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="optInConfirmationUrl">Opt-In Redirect URL (Optional)</Label>
                    <Input id="optInConfirmationUrl" name="optInConfirmationUrl" defaultValue={list.optInConfirmationUrl || ""} placeholder="https://yourbrand.com/thanks" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="unsubscribeConfirmationUrl">Unsubscribe Redirect URL (Optional)</Label>
                    <Input id="unsubscribeConfirmationUrl" name="unsubscribeConfirmationUrl" defaultValue={list.unsubscribeConfirmationUrl || ""} placeholder="https://yourbrand.com/bye" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="welcomeEmailHtml">Welcome Email HTML (Optional)</Label>
                    <Textarea id="welcomeEmailHtml" name="welcomeEmailHtml" defaultValue={list.welcomeEmailHtml || ""} placeholder="<p>Welcome to our list!</p>" className="h-32 font-mono text-sm" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="goodbyeEmailHtml">Goodbye Email HTML (Optional)</Label>
                    <Textarea id="goodbyeEmailHtml" name="goodbyeEmailHtml" defaultValue={list.goodbyeEmailHtml || ""} placeholder="<p>We're sad to see you go.</p>" className="h-32 font-mono text-sm" />
                </div>
            </div>
            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Settings"}
            </Button>
        </form>
    );
}
