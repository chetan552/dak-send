"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendTestEmail } from "@/app/actions/test-send";

export function TestSendButton({ campaignId }: { campaignId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleTestSend = async () => {
        if (!testEmail) {
            toast.error("Please enter an email address");
            return;
        }
        setIsSending(true);
        try {
            await sendTestEmail(campaignId, testEmail);
            toast.success(`Test email sent to ${testEmail}`);
            setIsOpen(false);
            setTestEmail("");
        } catch (e: any) {
            toast.error(e.message || "Failed to send test email");
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white gap-2"
            >
                <Send className="w-3 h-3" /> Send Test
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-9 w-56 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleTestSend()}
                autoFocus
            />
            <Button
                size="sm"
                onClick={handleTestSend}
                disabled={isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9"
            >
                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIsOpen(false); setTestEmail(""); }}
                className="h-9 text-zinc-500"
            >
                Cancel
            </Button>
        </div>
    );
}
