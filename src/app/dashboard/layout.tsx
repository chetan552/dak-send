import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { SidebarProviderStatus } from "@/components/sidebar-provider-status";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const userEmail = session.user?.email || "";
    const userName = session.user?.name || "User";

    return (
        <TooltipProvider delayDuration={300}>
        <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex transition-colors duration-300">
            {/* Desktop Sidebar — hidden on mobile */}
            <aside className="hidden md:flex w-64 border-r border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50 flex-col transition-colors duration-300 flex-shrink-0 sticky top-0 h-screen">
                <div className="px-5 py-5">
                    <Link href="/dashboard">
                        <Image src="/logo.svg" alt="DakSend" width={140} height={34} priority />
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <SidebarNav />
                </div>

                <SidebarProviderStatus />

                <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                        {userEmail?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{userName}</p>
                        <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <ThemeToggle />
                        <LogoutButton />
                    </div>
                </div>
            </aside>

            {/* Mobile Navigation */}
            <MobileNav userEmail={userEmail} userName={userName} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8 pb-20 md:pb-8">
                    {children}
                </div>
            </main>
        </div>
        </TooltipProvider>
    );
}
