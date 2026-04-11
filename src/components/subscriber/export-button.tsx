"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export function ExportSubscribersButton({ listId }: { listId: string }) {
    const [loading, setLoading] = useState(false);

    const handleExport = () => {
        setLoading(true);
        window.open(`/api/export?listId=${listId}`, "_blank");
        // Re-enable after a short delay — the download is streamed by the browser
        // and we have no reliable way to detect when it finishes.
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={loading}
            className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white gap-2"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
        </Button>
    );
}
