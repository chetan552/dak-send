"use client";

import { Button } from "@/components/ui/button";
import { deleteUser } from "@/app/actions/user";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

export function DeleteUserButton({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            setLoading(true);
            try {
                await deleteUser(userId);
            } catch (err: any) {
                alert(err.message || "Failed to delete user");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors h-8 px-2"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
    );
}
