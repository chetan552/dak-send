import { hasUsers } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { SignUpForm } from "./signup-form";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default async function SignUpPage() {
    // If users already exist, this instance is already set up — redirect to login
    const alreadySetUp = await hasUsers();
    if (alreadySetUp) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

            <Card className="w-full max-w-md z-10 border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
                <CardHeader className="space-y-3 pb-6">
                    <div className="mb-1">
                        <Image src="/logo.svg" alt="DakSend" width={150} height={36} priority />
                    </div>
                    <CardDescription className="text-zinc-400 text-base">
                        Create your admin account to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SignUpForm />
                </CardContent>
            </Card>
        </div>
    );
}
