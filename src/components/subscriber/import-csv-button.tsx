"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Papa from "papaparse";
import { importSubscribersAction } from "@/app/actions/subscriber";
import { useRouter } from "next/navigation";

export function ImportCsvButton({ listId, requireGdpr = false, customFields = [] }: { listId: string, requireGdpr?: boolean, customFields?: any[] }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [gdprConfirmed, setGdprConfirmed] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError("");
            setSuccess("");
        }
    };

    const handleImport = async () => {
        if (!file) {
            setError("Please select a valid CSV file.");
            return;
        }

        if (requireGdpr && !gdprConfirmed) {
            setError("You must confirm GDPR consent before importing.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const validSubscribers = results.data.filter((row: any) => row.email || row.Email).map((row: any) => {
                        const subscriberData: any = {
                            email: row.email || row.Email,
                            name: row.name || row.Name || undefined
                        };

                        // Dynamically map custom fields if present in CSV
                        const cfData: Record<string, string> = {};
                        let hasCustomFields = false;

                        customFields.forEach((cf: any) => {
                            // Check if the CSV row has a column name matching the custom field name exactly
                            if (row[cf.name] !== undefined) {
                                cfData[cf.id] = String(row[cf.name]);
                                hasCustomFields = true;
                            }
                        });

                        if (hasCustomFields) {
                            subscriberData.customFields = cfData;
                        }

                        return subscriberData;
                    });

                    if (validSubscribers.length === 0) {
                        setError("No valid valid emails found in your CSV. Ensure it has an 'email' or 'Email' column.");
                        setLoading(false);
                        return;
                    }

                    const formData = new FormData();
                    formData.append("listId", listId);
                    formData.append("subscribers", JSON.stringify(validSubscribers));

                    const { importedCount } = await importSubscribersAction(formData);
                    setSuccess(`Successfully processed ${importedCount} subscribers.`);
                    router.refresh();

                    setTimeout(() => {
                        setOpen(false);
                        setFile(null);
                        setGdprConfirmed(false);
                        setSuccess("");
                    }, 2000);

                } catch (err: any) {
                    setError(err.message || "An error occurred during import.");
                } finally {
                    setLoading(false);
                }
            },
            error: (error) => {
                setError(`CSV Parse Error: ${error.message}`);
                setLoading(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2">
                    <Upload className="w-4 h-4" /> Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Import Subscribers</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Upload a CSV containing &quot;email&quot; and optional &quot;name&quot; columns.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div
                        className="border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileUp className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                        {file ? (
                            <p className="text-sm font-medium text-white">{file.name}</p>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-white mb-1">Click to select CSV File</p>
                                <p className="text-xs text-zinc-500">Must include an &apos;email&apos; column header.</p>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                    </div>

                    {requireGdpr && (
                        <div className="flex items-start space-x-2 pt-2">
                            <Checkbox
                                id="gdpr-import"
                                checked={gdprConfirmed}
                                onCheckedChange={(checked) => setGdprConfirmed(checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label
                                    htmlFor="gdpr-import"
                                    className="text-sm font-medium leading-none"
                                >
                                    Confirm GDPR Consent
                                </Label>
                                <p className="text-sm text-zinc-400">
                                    I confirm that all subscribers in this CSV have provided explicit consent.
                                </p>
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    {success && <p className="text-sm text-green-400 text-center">{success}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); setFile(null); setGdprConfirmed(false); setError(""); setSuccess(""); }} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleImport}
                        disabled={!file || loading || (requireGdpr && !gdprConfirmed)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Start Import
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
