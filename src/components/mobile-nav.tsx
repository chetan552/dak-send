"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./sidebar-nav";

interface MobileNavProps {
    userEmail: string;
    userName: string;
}

export function MobileNav({ userEmail, userName }: MobileNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            {/* Mobile top bar - only visible on small screens */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center">
                    <Link href="/dashboard">
                        <Image src="/logo.svg" alt="DakSend" width={120} height={29} priority />
                    </Link>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label="Toggle menu"
                >
                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile slide-over panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Panel */}
                    <div className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col">
                        <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                            <span className="font-semibold text-zinc-900 dark:text-white">Menu</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <nav className="flex-1 px-4 space-y-1 mt-4">
                            {NAV_ITEMS.map((item) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href);

                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                                            isActive
                                                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                                                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/50"
                                        )}
                                    >
                                        <Icon className={cn(
                                            "w-5 h-5",
                                            isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400"
                                        )} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                                        {userEmail?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{userName || 'User'}</p>
                                        <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ThemeToggle />
                                    <LogoutButton />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Mobile bottom navigation bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5 flex items-center justify-around safe-area-pb">
                {NAV_ITEMS.filter(item => ["/dashboard", "/dashboard/lists", "/dashboard/campaigns", "/dashboard/analytics", "/dashboard/settings"].includes(item.href)).map(item => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                                isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </div>
        </>
    );
}
