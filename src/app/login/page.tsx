import { hasUsers } from "@/app/actions/auth";
import { LoginForm } from "./login-form";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default async function LoginPage() {
    const alreadySetUp = await hasUsers();

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.08),transparent)]"
            />

            <Card className="w-full max-w-md z-10 border-zinc-800/60 bg-zinc-900/50 shadow-lg">
                <CardHeader className="space-y-3 pb-6">
                    <div>
                        <Image src="/logo.svg" alt="DakSend" width={150} height={36} priority />
                    </div>
                    <CardDescription className="text-zinc-400">
                        Sign in to your workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                    {!alreadySetUp && (
                        <p className="mt-4 text-center text-sm text-zinc-500">
                            No account yet?{" "}
                            <Link href="/signup" className="text-zinc-300 hover:text-white underline underline-offset-4">
                                Set up your admin account
                            </Link>
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
