"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LogoutButton() {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
                    aria-label="Sign out"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">Sign out</TooltipContent>
        </Tooltip>
    );
}
