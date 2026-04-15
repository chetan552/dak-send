"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ShieldCheck,
    ShieldAlert,
    UserX,
    AlertTriangle,
    MailX,
    Plus,
    Trash2,
    Loader2,
    Globe,
    Building2,
    CheckCircle2,
} from "lucide-react";
import { addSuppression, removeSuppression } from "@/app/actions/suppression";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BrandStat {
    brandId: string;
    brandName: string;
    subscribed: number;
    unsubscribed: number;
    bounced: number;
    complained: number;
    suppressionCount: number;
    total: number;
}

interface RecentIssue {
    id: string;
    email: string;
    status: string;
    updatedAt: Date | string;
    list: { id: string; name: string; brand: { id: string; name: string } };
}

interface Suppression {
    id: string;
    email: string;
    reason: string;
    brandId: string | null;
    note: string | null;
    createdAt: Date | string;
    brand: { name: string } | null;
}

interface Props {
    stats: BrandStat[];
    recentIssues: RecentIssue[];
    suppressions: Suppression[];
    brands: { id: string; name: string }[];
    isAdmin: boolean;
}

function StatCard({
    icon,
    label,
    value,
    cardClass,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    cardClass: string;
    sub?: string;
}) {
    return (
        <div className={cn("flex items-center gap-4 p-4 rounded-xl border", cardClass)}>
            <div className="flex-shrink-0">{icon}</div>
            <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value.toLocaleString()}</p>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
                {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function reasonBadge(reason: string) {
    switch (reason) {
        case "bounce":
            return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">Bounce</Badge>;
        case "complaint":
            return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0">Complaint</Badge>;
        default:
            return <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-0">Manual</Badge>;
    }
}

export function DeliverabilityClient({ stats, recentIssues, suppressions: initialSuppressions, brands, isAdmin }: Props) {
    const [suppressions, setSuppressions] = useState<Suppression[]>(initialSuppressions);
    const [addEmails, setAddEmails] = useState("");
    const [addReason, setAddReason] = useState("manual");
    const [addBrandId, setAddBrandId] = useState<string>("global");
    const [addNote, setAddNote] = useState("");
    const [isPending, startTransition] = useTransition();

    const totals = stats.reduce(
        (acc, b) => ({
            subscribed: acc.subscribed + b.subscribed,
            unsubscribed: acc.unsubscribed + b.unsubscribed,
            bounced: acc.bounced + b.bounced,
            complained: acc.complained + b.complained,
        }),
        { subscribed: 0, unsubscribed: 0, bounced: 0, complained: 0 },
    );

    const handleAddSuppression = () => {
        const emails = addEmails
            .split(/[\n,]+/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e.includes("@"));

        if (emails.length === 0) {
            toast.error("Enter at least one valid email address");
            return;
        }

        startTransition(async () => {
            try {
                const brandIdArg = addBrandId === "global" ? null : addBrandId;
                await addSuppression(emails, addReason, brandIdArg, addNote || undefined);
                toast.success(`${emails.length} email${emails.length > 1 ? "s" : ""} added to suppression list`);
                setAddEmails("");
                setAddNote("");
                // Optimistic: reload suppressions by refetching via router
                window.location.reload();
            } catch (err: any) {
                toast.error(err?.message || "Failed to add suppression");
            }
        });
    };

    const handleRemove = (id: string) => {
        startTransition(async () => {
            try {
                await removeSuppression(id);
                setSuppressions(s => s.filter(x => x.id !== id));
                toast.success("Removed from suppression list");
            } catch (err: any) {
                toast.error(err?.message || "Failed to remove");
            }
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Deliverability</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Monitor bounces, complaints, and manage your suppression list.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />}
                    label="Subscribed"
                    value={totals.subscribed}
                    cardClass="border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/20"
                />
                <StatCard
                    icon={<UserX className="w-8 h-8 text-zinc-500 dark:text-zinc-400" />}
                    label="Unsubscribed"
                    value={totals.unsubscribed}
                    cardClass="border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50"
                />
                <StatCard
                    icon={<ShieldAlert className="w-8 h-8 text-red-500 dark:text-red-400" />}
                    label="Bounced"
                    value={totals.bounced}
                    cardClass="border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20"
                    sub="Hard bounces from SES"
                />
                <StatCard
                    icon={<AlertTriangle className="w-8 h-8 text-orange-500 dark:text-orange-400" />}
                    label="Complained"
                    value={totals.complained}
                    cardClass="border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20"
                    sub="Marked as spam"
                />
            </div>

            <Tabs defaultValue="brands">
                <TabsList className="bg-zinc-100 dark:bg-zinc-900">
                    <TabsTrigger value="brands">By Brand</TabsTrigger>
                    <TabsTrigger value="recent">
                        Recent Issues
                        {recentIssues.length > 0 && (
                            <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                                {recentIssues.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="suppression">
                        Suppression List
                        {suppressions.length > 0 && (
                            <span className="ml-1.5 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full">
                                {suppressions.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* By Brand tab */}
                <TabsContent value="brands" className="mt-6">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Subscriber Health by Brand</CardTitle>
                            <CardDescription>Status breakdown across all your lists.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats.length === 0 ? (
                                <p className="text-zinc-400 text-sm text-center py-8">No brands found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brand</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-green-600 uppercase tracking-wider">Subscribed</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unsubscribed</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Bounced</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-orange-500 uppercase tracking-wider">Complained</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bounce Rate</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Complaint Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.map(brand => {
                                                const bounceRate = brand.total > 0 ? ((brand.bounced / brand.total) * 100) : 0;
                                                const complaintRate = brand.total > 0 ? ((brand.complained / brand.total) * 100) : 0;
                                                return (
                                                    <tr key={brand.brandId} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">{brand.brandName}</td>
                                                        <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">{brand.subscribed.toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-right text-zinc-500">{brand.unsubscribed.toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-right text-red-500 font-medium">{brand.bounced.toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-right text-orange-500 font-medium">{brand.complained.toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", bounceRate >= 5 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : bounceRate >= 2 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
                                                                {bounceRate.toFixed(2)}%
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", complaintRate >= 0.1 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : complaintRate >= 0.05 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}>
                                                                {complaintRate.toFixed(3)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {/* Industry threshold info */}
                            <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                                <p><span className="font-semibold text-zinc-700 dark:text-zinc-300">Bounce rate thresholds:</span> &lt;2% green · 2–5% yellow · &gt;5% red (SES suspends at ~10%)</p>
                                <p><span className="font-semibold text-zinc-700 dark:text-zinc-300">Complaint rate thresholds:</span> &lt;0.05% green · 0.05–0.1% yellow · &gt;0.1% red (Gmail/Yahoo bulk sender limit)</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recent Issues tab */}
                <TabsContent value="recent" className="mt-6">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Bounces & Complaints</CardTitle>
                            <CardDescription>Latest 50 subscribers marked as bounced or complained.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentIssues.length === 0 ? (
                                <div className="text-center py-12">
                                    <ShieldCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                    <p className="text-zinc-500 font-medium">No bounces or complaints</p>
                                    <p className="text-zinc-400 text-sm mt-1">Your lists are clean.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brand / List</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentIssues.map(issue => (
                                                <tr key={issue.id} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">{issue.email}</td>
                                                    <td className="py-3 px-4">
                                                        {issue.status === "bounced" ? (
                                                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
                                                                <MailX className="w-3 h-3" /> Bounced
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 gap-1">
                                                                <AlertTriangle className="w-3 h-3" /> Complained
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{issue.list.brand.name}</span>
                                                        <span className="mx-1 text-zinc-300 dark:text-zinc-600">/</span>
                                                        {issue.list.name}
                                                    </td>
                                                    <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">
                                                        {new Date(issue.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Suppression List tab */}
                <TabsContent value="suppression" className="mt-6 space-y-6">
                    {/* Add form */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Add to Suppression List
                            </CardTitle>
                            <CardDescription>
                                Suppressed addresses will never receive emails from your account, even if subscribed.
                                Bounced and complained addresses are auto-suppressed by SES notifications.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-700 dark:text-zinc-300">Email Addresses</Label>
                                    <textarea
                                        value={addEmails}
                                        onChange={e => setAddEmails(e.target.value)}
                                        placeholder="one@example.com&#10;two@example.com&#10;(one per line or comma-separated)"
                                        className="w-full min-h-[100px] text-sm border rounded-md p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white resize-y placeholder:text-zinc-400"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-700 dark:text-zinc-300">Reason</Label>
                                        <Select value={addReason} onValueChange={setAddReason}>
                                            <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                                <SelectItem value="manual">Manual block</SelectItem>
                                                <SelectItem value="unsubscribe">Unsubscribe request</SelectItem>
                                                <SelectItem value="legal">Legal / cease-and-desist</SelectItem>
                                                <SelectItem value="spam_trap">Known spam trap</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-700 dark:text-zinc-300">Scope</Label>
                                        <Select value={addBrandId} onValueChange={setAddBrandId}>
                                            <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                                {isAdmin && <SelectItem value="global">Global (all brands)</SelectItem>}
                                                {brands.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>{b.name} only</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-700 dark:text-zinc-300">Note (optional)</Label>
                                        <Input
                                            value={addNote}
                                            onChange={e => setAddNote(e.target.value)}
                                            placeholder="e.g. Customer requested removal"
                                            className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={handleAddSuppression}
                                disabled={isPending || !addEmails.trim()}
                                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-100 gap-2"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add to Suppression List
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Suppression table */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Suppressed Addresses</CardTitle>
                            <CardDescription>{suppressions.length} total suppressed email{suppressions.length !== 1 ? "s" : ""}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {suppressions.length === 0 ? (
                                <div className="text-center py-10">
                                    <ShieldCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                                    <p className="text-zinc-400 text-sm">No suppressions yet. Bounced and complained emails are added automatically.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Reason</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scope</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Note</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Added</th>
                                                <th className="py-3 px-4" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {suppressions.map(s => (
                                                <tr key={s.id} className="border-b border-zinc-50 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-3 px-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">{s.email}</td>
                                                    <td className="py-3 px-4">{reasonBadge(s.reason)}</td>
                                                    <td className="py-3 px-4">
                                                        {s.brandId === null ? (
                                                            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                                <Globe className="w-3.5 h-3.5" /> Global
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                                <Building2 className="w-3.5 h-3.5" /> {s.brand?.name ?? s.brandId}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-zinc-400 text-xs max-w-[160px] truncate">{s.note ?? "—"}</td>
                                                    <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">
                                                        {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemove(s.id)}
                                                            disabled={isPending}
                                                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-30"
                                                            title="Remove suppression"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
