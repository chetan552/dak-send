"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/app/actions/auth";

export function SignUpForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signUp(name, email, password);

            // Auto sign-in after successful registration
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError("Account created but sign-in failed. Please go to the login page.");
                setLoading(false);
            } else {
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                    {error}
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Full name</Label>
                <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    required
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
                />
            </div>
            <div className="space-y-2 pb-2">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
                />
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors font-medium text-base h-11 disabled:opacity-80"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                    </>
                ) : (
                    "Create admin account"
                )}
            </Button>
        </form>
    );
}
