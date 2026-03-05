"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Loader2, RefreshCw } from "lucide-react";
import { checkBrandDeliverability } from "@/app/actions/deliverability";
import { toast } from "sonner";

interface DeliverabilityCardProps {
    brandId: string;
    brandName: string;
    domain: string;
}

function StatusBadge({ status }: { status: string }) {
    if (status === "pass") {
        return (
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-xs font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Pass
            </span>
        );
    }
    if (status === "warn") {
        return (
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 text-xs font-medium flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Warning
            </span>
        );
    }
    return (
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs font-medium flex items-center gap-1">
            <ShieldX className="w-3 h-3" /> Fail
        </span>
    );
}

export function DeliverabilityCard({ brandId, brandName, domain }: DeliverabilityCardProps) {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
        setLoading(true);
        try {
            const r = await checkBrandDeliverability(brandId);
            setResult(r);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-white dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-medium text-zinc-900 dark:text-white">{brandName}</h3>
                            <p className="text-xs text-zinc-500">{domain}</p>
                        </div>
                    </div>
                    <Button onClick={handleCheck} disabled={loading} variant="outline" size="sm" className="gap-2">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {result ? "Re-check" : "Check DNS"}
                    </Button>
                </div>

                {result && (
                    <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        {/* SPF */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-zinc-900 dark:text-white">SPF</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{result.spf.message}</p>
                                {result.spf.record && (
                                    <code className="text-[10px] text-zinc-400 mt-1 block truncate">{result.spf.record}</code>
                                )}
                            </div>
                            <StatusBadge status={result.spf.status} />
                        </div>

                        {/* DKIM */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-zinc-900 dark:text-white">DKIM</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{result.dkim.message}</p>
                                {result.dkim.record && (
                                    <code className="text-[10px] text-zinc-400 mt-1 block truncate">{result.dkim.record}</code>
                                )}
                            </div>
                            <StatusBadge status={result.dkim.status} />
                        </div>

                        {/* DMARC */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-zinc-900 dark:text-white">DMARC</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{result.dmarc.message}</p>
                                {result.dmarc.record && (
                                    <code className="text-[10px] text-zinc-400 mt-1 block truncate">{result.dmarc.record}</code>
                                )}
                            </div>
                            <StatusBadge status={result.dmarc.status} />
                        </div>

                        {/* MX */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-zinc-900 dark:text-white">MX Records</p>
                                {result.mx.records.length > 0 ? (
                                    <p className="text-xs text-zinc-500 mt-0.5">{result.mx.records.length} MX record(s) found</p>
                                ) : (
                                    <p className="text-xs text-zinc-500 mt-0.5">No MX records found</p>
                                )}
                            </div>
                            <StatusBadge status={result.mx.status} />
                        </div>

                        {/* Overall score */}
                        {(() => {
                            const checks = [result.spf, result.dkim, result.dmarc, result.mx];
                            const passCount = checks.filter((c: any) => c.status === "pass").length;
                            const score = Math.round((passCount / checks.length) * 100);
                            return (
                                <div className={`mt-3 p-3 rounded-lg text-center ${score >= 75 ? 'bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20' :
                                        score >= 50 ? 'bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-200 dark:border-yellow-500/20' :
                                            'bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20'
                                    }`}>
                                    <p className={`text-lg font-bold ${score >= 75 ? 'text-green-700 dark:text-green-400' :
                                            score >= 50 ? 'text-yellow-700 dark:text-yellow-400' :
                                                'text-red-700 dark:text-red-400'
                                        }`}>
                                        Deliverability Score: {score}%
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {passCount} of {checks.length} checks passed
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
