import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading...</span>
            </div>
        </div>
    );
}
