"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportSubscribersButton({ listId }: { listId: string }) {
    const handleExport = () => {
        window.open(`/api/export?listId=${listId}`, "_blank");
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white gap-2"
        >
            <Download className="w-4 h-4" /> Export CSV
        </Button>
    );
}
