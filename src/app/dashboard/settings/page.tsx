import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, User, Flame, ShieldCheck } from "lucide-react";
import { CreateUserButton } from "@/components/settings/create-user-button";
import { DeleteUserButton } from "@/components/settings/delete-user-button";
import { Badge } from "@/components/ui/badge";
import { BrandUserAssignment } from "@/components/brand/brand-user-assignment";
import { Briefcase, Cloud } from "lucide-react";
import { AWSConfigForm } from "@/components/settings/aws-config-form";
import { SESStats } from "@/components/settings/ses-stats";
import { getSystemSettings } from "@/app/actions/settings";
import { UsersTable } from "@/components/settings/users-table";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import Link from "next/link";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) return null;

    const currentUserRole = (session.user as any)?.role || "user";
    const currentUserId = (session.user as any)?.id;

    let allUsers: any[] = [];
    let allBrands: any[] = [];
    let systemSettings: Record<string, string> = {};

    if (currentUserRole === "admin") {
        allUsers = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, email: true, role: true, createdAt: true }
        });
        allBrands = await prisma.brand.findMany({
            include: { users: { select: { id: true, email: true, name: true } } },
            orderBy: { name: 'asc' }
        });
        systemSettings = await getSystemSettings();
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Settings</h1>
                    <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Manage your account and platform settings.</p>
                </div>
            </div>

            {/* Quick access cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/dashboard/settings/warmup" className="group">
                    <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-orange-500/50 dark:hover:border-orange-500/30 transition-all hover:shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Flame className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Domain Warmup</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Gradually increase sending volume</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/settings/deliverability" className="group">
                    <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/30 transition-all hover:shadow-md">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Email Deliverability</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Check SPF, DKIM, DMARC records</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Your Profile
                    </CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">Your personal account information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div>
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-500">Name</p>
                            <p className="text-zinc-900 dark:text-white font-medium">{session.user.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-500">Email Address</p>
                            <p className="text-zinc-900 dark:text-white font-medium">{session.user.email}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-500">Role</p>
                            {currentUserRole === 'admin' ? (
                                <Badge className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30">Administrator</Badge>
                            ) : (
                                <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">Standard User</Badge>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-6">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">Change Password</h3>
                        <ChangePasswordForm />
                    </div>
                </CardContent>
            </Card>

            {currentUserRole === "admin" && (
                <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <SESStats />
                    <AWSConfigForm initialSettings={systemSettings} />
                </div>
            )}

            {currentUserRole === "admin" && (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm mt-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> User Management
                            </CardTitle>
                            <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">Add and manage users on this DakSend instance.</CardDescription>
                        </div>
                        <CreateUserButton />
                    </CardHeader>
                    <CardContent>
                        <UsersTable users={allUsers} currentUserId={currentUserId} />
                    </CardContent>
                </Card>
            )}

            {currentUserRole === "admin" && (
                <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm mt-8">
                    <CardHeader>
                        <CardTitle className="text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Brand Access Management
                        </CardTitle>
                        <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
                            Assign users to manage specific sender brands.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allBrands.map(brand => (
                                <div key={brand.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col h-full">
                                    <div className="flex-1 mb-4">
                                        <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{brand.name}</h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                            {brand.users.length} assigned {brand.users.length === 1 ? 'user' : 'users'}
                                        </p>
                                    </div>
                                    <BrandUserAssignment brandId={brand.id} assignedUsers={brand.users} ownerId={brand.userId} />
                                </div>
                            ))}
                            {allBrands.length === 0 && (
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm italic col-span-full">No brands created yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Webhook & Integration Section */}
            <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-zinc-900 dark:text-white">Integrations</CardTitle>
                    <CardDescription className="text-zinc-500 dark:text-zinc-400">Connect external services.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/dashboard/settings/webhooks" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium">
                        🔗 Manage Webhooks
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
