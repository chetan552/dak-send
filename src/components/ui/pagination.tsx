"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Utility to generate a new URL with the updated page parameter
    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    if (totalPages <= 1) return null;

    // Logic to calculate which page numbers to show
    const getVisiblePages = () => {
        const delta = 2;
        const range = [];
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            range.unshift("...");
        }
        if (currentPage + delta < totalPages - 1) {
            range.push("...");
        }

        range.unshift(1);
        if (totalPages > 1) {
            range.push(totalPages);
        }

        return range;
    };

    const visiblePages = getVisiblePages();

    return (
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            {/* Mobile View */}
            <div className="flex flex-1 justify-between sm:hidden">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    asChild={currentPage > 1}
                >
                    {currentPage > 1 ? (
                        <Link href={createPageURL(currentPage - 1)}>Previous</Link>
                    ) : (
                        <span>Previous</span>
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    asChild={currentPage < totalPages}
                >
                    {currentPage < totalPages ? (
                        <Link href={createPageURL(currentPage + 1)}>Next</Link>
                    ) : (
                        <span>Next</span>
                    )}
                </Button>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        Page <span className="font-medium">{currentPage}</span> of{" "}
                        <span className="font-medium">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Button
                            variant="outline"
                            className="rounded-l-md rounded-r-none px-2"
                            disabled={currentPage <= 1}
                            asChild={currentPage > 1}
                        >
                            {currentPage > 1 ? (
                                <Link href={createPageURL(currentPage - 1)}>
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-4 w-4" />
                                </Link>
                            ) : (
                                <span>
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-4 w-4" opacity="0.5" />
                                </span>
                            )}
                        </Button>

                        {visiblePages.map((page, index) => {
                            if (page === "...") {
                                return (
                                    <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:outline-offset-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </span>
                                );
                            }

                            const isCurrent = page === currentPage;
                            return (
                                <Link
                                    key={`page-${page}`}
                                    href={createPageURL(page)}
                                    aria-current={isCurrent ? "page" : undefined}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ring-1 ring-inset ${isCurrent
                                            ? "z-10 bg-indigo-600 dark:bg-indigo-500 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ring-indigo-600 dark:ring-indigo-500"
                                            : "text-zinc-900 dark:text-zinc-100 ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    {page}
                                </Link>
                            );
                        })}

                        <Button
                            variant="outline"
                            className="rounded-r-md rounded-l-none px-2"
                            disabled={currentPage >= totalPages}
                            asChild={currentPage < totalPages}
                        >
                            {currentPage < totalPages ? (
                                <Link href={createPageURL(currentPage + 1)}>
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <span>
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-4 w-4" opacity="0.5" />
                                </span>
                            )}
                        </Button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
