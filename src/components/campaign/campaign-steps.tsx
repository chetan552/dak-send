import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignStep = "content" | "preview" | "send";

const STEPS: { key: CampaignStep; label: string; sub: string; path: (id: string) => string }[] = [
    { key: "content", label: "Content", sub: "Design your email", path: (id) => `/dashboard/campaigns/${id}` },
    { key: "preview", label: "Preview", sub: "Check every client", path: (id) => `/dashboard/campaigns/${id}/preview` },
    { key: "send", label: "Send", sub: "Pick lists & dispatch", path: (id) => `/dashboard/campaigns/${id}/send` },
];

/**
 * Horizontal progress indicator shown across the campaign build flow
 * (Content → Preview → Send). Completed and upcoming steps are navigable while
 * the campaign is still editable, so the whole journey feels like one connected
 * flow rather than a set of isolated pages.
 */
export function CampaignSteps({
    campaignId,
    current,
    editable = true,
    className,
}: {
    campaignId: string;
    current: CampaignStep;
    editable?: boolean;
    className?: string;
}) {
    const currentIndex = STEPS.findIndex((s) => s.key === current);

    return (
        <nav
            aria-label="Campaign progress"
            className={cn(
                "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 px-4 py-3.5 sm:px-6 shadow-sm",
                className,
            )}
        >
            <ol className="flex items-center">
                {STEPS.map((step, i) => {
                    const state: "complete" | "current" | "upcoming" =
                        i < currentIndex ? "complete" : i === currentIndex ? "current" : "upcoming";
                    // Any step other than the current one is reachable while editable.
                    const clickable = editable && i !== currentIndex;

                    const marker = (
                        <span
                            className={cn(
                                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                                state === "complete" &&
                                    "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500",
                                state === "current" &&
                                    "border-indigo-600 bg-indigo-50 text-indigo-700 ring-4 ring-indigo-100 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
                                state === "upcoming" &&
                                    "border-zinc-300 bg-transparent text-zinc-400 dark:border-zinc-700 dark:text-zinc-500 group-hover:border-zinc-400 dark:group-hover:border-zinc-500",
                            )}
                        >
                            {state === "complete" ? <Check className="h-4 w-4" /> : i + 1}
                        </span>
                    );

                    const text = (
                        <span className="min-w-0 hidden sm:flex flex-col leading-tight">
                            <span
                                className={cn(
                                    "text-sm font-semibold truncate",
                                    state === "upcoming"
                                        ? "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                                        : "text-zinc-900 dark:text-white",
                                )}
                            >
                                {step.label}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{step.sub}</span>
                        </span>
                    );

                    const inner = <span className="flex items-center gap-3">{marker}{text}</span>;

                    return (
                        <li key={step.key} className="flex flex-1 items-center last:flex-none">
                            {clickable ? (
                                <Link
                                    href={step.path(campaignId)}
                                    className="group flex items-center gap-3 rounded-lg transition-opacity"
                                >
                                    {inner}
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3" aria-current={state === "current" ? "step" : undefined}>
                                    {inner}
                                </div>
                            )}
                            {i < STEPS.length - 1 && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        "mx-3 sm:mx-4 h-px flex-1 rounded",
                                        i < currentIndex ? "bg-indigo-500/70" : "bg-zinc-200 dark:bg-zinc-800",
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
