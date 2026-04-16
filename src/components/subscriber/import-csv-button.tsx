"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileUp, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Papa from "papaparse";
import { importSubscribersAction, checkExistingEmailsAction, type ImportResult } from "@/app/actions/subscriber";
import { useRouter } from "next/navigation";

type CustomField = { id: string; name: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const IGNORE = "__ignore__";
const EMAIL_FIELD = "__email__";
const NAME_FIELD = "__name__";
const STATUS_FIELD = "__status__";

type ParsedRow = Record<string, string>;

type Mapping = Record<string, string>; // csvColumn -> EMAIL_FIELD | NAME_FIELD | STATUS_FIELD | customFieldId | IGNORE

type PreviewStats = {
    total: number;
    valid: number;
    invalid: number;
    invalidExamples: string[];
    existing: number;
};

type Step = "source" | "mapping" | "preview" | "result";

function autoMap(columns: string[], customFields: CustomField[]): Mapping {
    const mapping: Mapping = {};
    let emailAssigned = false;
    let nameAssigned = false;

    for (const col of columns) {
        const lower = col.trim().toLowerCase();
        if (!emailAssigned && (lower === "email" || lower === "email address" || lower === "e-mail")) {
            mapping[col] = EMAIL_FIELD;
            emailAssigned = true;
            continue;
        }
        if (!nameAssigned && (lower === "name" || lower === "full name" || lower === "fullname")) {
            mapping[col] = NAME_FIELD;
            nameAssigned = true;
            continue;
        }
        if (lower === "status" || lower === "subscriber status" || lower === "state") {
            mapping[col] = STATUS_FIELD;
            continue;
        }
        const cf = customFields.find(c => c.name.toLowerCase() === lower);
        if (cf) {
            mapping[col] = cf.id;
            continue;
        }
        mapping[col] = IGNORE;
    }

    // Fallback: first column with "email" substring if nothing matched
    if (!emailAssigned) {
        const guess = columns.find(c => c.toLowerCase().includes("email") || c.toLowerCase().includes("mail"));
        if (guess) mapping[guess] = EMAIL_FIELD;
    }

    return mapping;
}

function buildSubscribers(rows: ParsedRow[], mapping: Mapping): { email: string; name?: string; status?: string; customFields?: Record<string, string> }[] {
    const emailCol = Object.keys(mapping).find(c => mapping[c] === EMAIL_FIELD);
    const nameCol = Object.keys(mapping).find(c => mapping[c] === NAME_FIELD);
    const statusCol = Object.keys(mapping).find(c => mapping[c] === STATUS_FIELD);
    const cfCols = Object.entries(mapping).filter(([, v]) => v !== EMAIL_FIELD && v !== NAME_FIELD && v !== STATUS_FIELD && v !== IGNORE);

    if (!emailCol) return [];

    return rows.map(row => {
        const out: { email: string; name?: string; status?: string; customFields?: Record<string, string> } = {
            email: (row[emailCol] || "").trim(),
        };
        if (nameCol) {
            const n = (row[nameCol] || "").trim();
            if (n) out.name = n;
        }
        if (statusCol) {
            const s = (row[statusCol] || "").trim();
            if (s) out.status = s;
        }
        if (cfCols.length > 0) {
            const cf: Record<string, string> = {};
            for (const [col, cfId] of cfCols) {
                const v = (row[col] || "").trim();
                if (v) cf[cfId] = v;
            }
            if (Object.keys(cf).length > 0) out.customFields = cf;
        }
        return out;
    });
}

function downloadTemplate(customFields: CustomField[]) {
    const headers = ["email", "name", ...customFields.map(cf => cf.name)];
    const example = ["jane@example.com", "Jane Doe", ...customFields.map(() => "")];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(","), example.map(escape).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
}

export function ImportCsvButton({ listId, requireGdpr = false, customFields = [] }: { listId: string, requireGdpr?: boolean, customFields?: CustomField[] }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>("source");
    const [sourceTab, setSourceTab] = useState<"upload" | "paste">("upload");
    const [file, setFile] = useState<File | null>(null);
    const [pasteText, setPasteText] = useState("");
    const [columns, setColumns] = useState<string[]>([]);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [mapping, setMapping] = useState<Mapping>({});
    const [stats, setStats] = useState<PreviewStats | null>(null);
    const [updateExisting, setUpdateExisting] = useState(false);
    const [gdprConfirmed, setGdprConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const reset = () => {
        setStep("source");
        setSourceTab("upload");
        setFile(null);
        setPasteText("");
        setColumns([]);
        setParsedRows([]);
        setMapping({});
        setStats(null);
        setUpdateExisting(false);
        setGdprConfirmed(false);
        setLoading(false);
        setError("");
        setImportResult(null);
    };

    const handleClose = (next: boolean) => {
        setOpen(next);
        if (!next) reset();
    };

    const subscribers = useMemo(() => buildSubscribers(parsedRows, mapping), [parsedRows, mapping]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError("");
        }
    };

    const proceedFromUpload = () => {
        if (!file) {
            setError("Please select a CSV file.");
            return;
        }
        setError("");
        setLoading(true);
        Papa.parse<ParsedRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const cols = (results.meta.fields || []).filter(Boolean);
                if (cols.length === 0) {
                    setError("Could not detect any columns in this CSV.");
                    setLoading(false);
                    return;
                }
                setColumns(cols);
                setParsedRows(results.data as ParsedRow[]);
                setMapping(autoMap(cols, customFields));
                setStep("mapping");
                setLoading(false);
            },
            error: (err) => {
                setError(`CSV parse error: ${err.message}`);
                setLoading(false);
            },
        });
    };

    const proceedFromPaste = async () => {
        const lines = pasteText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            setError("Paste at least one email.");
            return;
        }
        const rows: ParsedRow[] = lines.map(line => {
            const [email, ...rest] = line.split(",").map(s => s.trim());
            return { email: email || "", name: rest.join(",").trim() };
        });
        const fixedMapping: Mapping = { email: EMAIL_FIELD, name: NAME_FIELD };
        setColumns(["email", "name"]);
        setParsedRows(rows);
        setMapping(fixedMapping);
        setError("");
        await runPreview(rows, fixedMapping);
    };

    const proceedFromMapping = async () => {
        const hasEmail = Object.values(mapping).includes(EMAIL_FIELD);
        if (!hasEmail) {
            setError("Map exactly one column to Email.");
            return;
        }
        setError("");
        await runPreview(parsedRows, mapping);
    };

    const runPreview = async (rows: ParsedRow[], map: Mapping) => {
        setLoading(true);
        try {
            const built = buildSubscribers(rows, map);
            const valid: string[] = [];
            const invalidExamples: string[] = [];
            let invalidCount = 0;
            const seen = new Set<string>();
            for (const s of built) {
                const e = s.email.toLowerCase();
                if (!e || !EMAIL_REGEX.test(e)) {
                    invalidCount++;
                    if (invalidExamples.length < 3 && s.email) invalidExamples.push(s.email);
                    continue;
                }
                if (seen.has(e)) continue;
                seen.add(e);
                valid.push(e);
            }

            let existing = 0;
            if (valid.length > 0) {
                const { existing: existingEmails } = await checkExistingEmailsAction(listId, valid);
                existing = existingEmails.length;
            }

            setStats({
                total: built.length,
                valid: valid.length,
                invalid: invalidCount,
                invalidExamples,
                existing,
            });
            setStep("preview");
        } catch (err: any) {
            setError(err.message || "Failed to build preview.");
        } finally {
            setLoading(false);
        }
    };

    const confirmImport = async () => {
        if (requireGdpr && !gdprConfirmed) {
            setError("Confirm GDPR consent to continue.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("listId", listId);
            formData.append("subscribers", JSON.stringify(subscribers));
            formData.append("updateExisting", updateExisting ? "true" : "false");

            const result = await importSubscribersAction(formData);
            setImportResult(result);
            setStep("result");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Import failed.");
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        setError("");
        if (step === "preview") {
            // Paste flow has no mapping step; jump back to source.
            if (columns.length === 2 && columns[0] === "email" && columns[1] === "name" && Object.values(mapping).every(v => v === EMAIL_FIELD || v === NAME_FIELD)) {
                setStep("source");
            } else {
                setStep("mapping");
            }
        } else if (step === "mapping") {
            setStep("source");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2">
                    <Upload className="w-4 h-4" /> Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl">Import Subscribers</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        {step === "source" && "Upload a CSV or paste a list of emails."}
                        {step === "mapping" && "Match each CSV column to a subscriber field."}
                        {step === "preview" && "Review what will be imported."}
                        {step === "result" && "Import complete."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 min-h-[260px]">
                    {step === "source" && (
                        <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as "upload" | "paste")}>
                            <div className="flex items-center justify-between">
                                <TabsList className="bg-zinc-900">
                                    <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                                    <TabsTrigger value="paste">Paste emails</TabsTrigger>
                                </TabsList>
                                <button
                                    type="button"
                                    onClick={() => downloadTemplate(customFields)}
                                    className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                                >
                                    <Download className="w-3 h-3" /> Download template
                                </button>
                            </div>

                            <TabsContent value="upload" className="mt-4">
                                <div
                                    className="border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileUp className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                                    {file ? (
                                        <p className="text-sm font-medium text-white">{file.name}</p>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-white mb-1">Click to select a CSV file</p>
                                            <p className="text-xs text-zinc-500">Must include an email column.</p>
                                        </>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,text/csv" onChange={handleFileChange} />
                                </div>
                            </TabsContent>

                            <TabsContent value="paste" className="mt-4">
                                <Label htmlFor="paste-emails" className="text-sm text-zinc-300">
                                    One per line. Optional name after a comma: <span className="text-zinc-500">jane@example.com, Jane Doe</span>
                                </Label>
                                <Textarea
                                    id="paste-emails"
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    placeholder={"jane@example.com\njohn@example.com, John Smith"}
                                    className="mt-2 h-40 bg-zinc-900 border-zinc-800 text-white font-mono text-sm"
                                />
                            </TabsContent>
                        </Tabs>
                    )}

                    {step === "mapping" && (
                        <div className="space-y-4">
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                {columns.map(col => (
                                    <div key={col} className="flex items-center justify-between gap-3">
                                        <span className="text-sm text-zinc-300 truncate flex-1" title={col}>{col}</span>
                                        <Select value={mapping[col] || IGNORE} onValueChange={(v) => {
                                            setMapping(prev => {
                                                const next = { ...prev };
                                                // Email, Name and Status must be unique — clear any other column holding them.
                                                if (v === EMAIL_FIELD || v === NAME_FIELD || v === STATUS_FIELD) {
                                                    for (const k of Object.keys(next)) {
                                                        if (next[k] === v && k !== col) next[k] = IGNORE;
                                                    }
                                                }
                                                next[col] = v;
                                                return next;
                                            });
                                        }}>
                                            <SelectTrigger className="w-[220px] bg-zinc-900 border-zinc-800 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                                                <SelectItem value={EMAIL_FIELD}>Email</SelectItem>
                                                <SelectItem value={NAME_FIELD}>Name</SelectItem>
                                                <SelectItem value={STATUS_FIELD}>Status</SelectItem>
                                                {customFields.map(cf => (
                                                    <SelectItem key={cf.id} value={cf.id}>{cf.name}</SelectItem>
                                                ))}
                                                <SelectItem value={IGNORE}>Ignore</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs text-zinc-500">
                                Sample: {parsedRows.slice(0, 3).map((r, i) => {
                                    const built = buildSubscribers([r], mapping)[0];
                                    return built ? <div key={i} className="font-mono text-zinc-400">{built.email || "—"}{built.name ? ` · ${built.name}` : ""}</div> : null;
                                })}
                            </div>
                        </div>
                    )}

                    {step === "preview" && stats && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Stat label="Total rows" value={stats.total} />
                                <Stat label="Valid emails" value={stats.valid} accent="text-green-400" />
                                <Stat label="Invalid" value={stats.invalid} accent={stats.invalid > 0 ? "text-amber-400" : undefined} />
                                <Stat label="Already in list" value={stats.existing} accent={stats.existing > 0 ? "text-blue-400" : undefined} />
                            </div>
                            {stats.invalidExamples.length > 0 && (
                                <div className="text-xs text-zinc-500">
                                    Invalid examples: <span className="font-mono text-zinc-400">{stats.invalidExamples.join(", ")}</span>
                                </div>
                            )}

                            <div className="border border-zinc-800 rounded-md p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="update-existing"
                                        checked={updateExisting}
                                        onCheckedChange={(v) => setUpdateExisting(v as boolean)}
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <Label htmlFor="update-existing" className="text-sm font-medium">
                                            Update name and custom fields for existing subscribers
                                        </Label>
                                        <p className="text-xs text-zinc-500">
                                            Subscriber status is never changed by import. Unsubscribed and bounced contacts stay that way.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {requireGdpr && (
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="gdpr-import"
                                        checked={gdprConfirmed}
                                        onCheckedChange={(v) => setGdprConfirmed(v as boolean)}
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <Label htmlFor="gdpr-import" className="text-sm font-medium">Confirm GDPR consent</Label>
                                        <p className="text-xs text-zinc-500">All subscribers in this import have provided explicit consent.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === "result" && importResult && (
                        <div className="space-y-4 text-center py-4">
                            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                            <div className="grid grid-cols-2 gap-3 text-left">
                                <Stat label="Created" value={importResult.created} accent="text-green-400" />
                                <Stat label="Updated" value={importResult.updated} accent="text-blue-400" />
                                <Stat label="Skipped (existing)" value={importResult.skipped.existing} />
                                <Stat label="Skipped (invalid)" value={importResult.skipped.invalid} accent={importResult.skipped.invalid > 0 ? "text-amber-400" : undefined} />
                                {importResult.skipped.errored > 0 && (
                                    <Stat label="Errored" value={importResult.skipped.errored} accent="text-red-400" />
                                )}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                </div>

                <DialogFooter className="flex sm:justify-between gap-2">
                    <div>
                        {(step === "mapping" || step === "preview") && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={goBack}
                                disabled={loading}
                                className="text-zinc-400 hover:text-white gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step !== "result" && (
                            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                                Cancel
                            </Button>
                        )}

                        {step === "source" && sourceTab === "upload" && (
                            <Button type="button" onClick={proceedFromUpload} disabled={!file || loading} className="bg-blue-600 text-white hover:bg-blue-700">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Continue
                            </Button>
                        )}
                        {step === "source" && sourceTab === "paste" && (
                            <Button type="button" onClick={proceedFromPaste} disabled={!pasteText.trim() || loading} className="bg-blue-600 text-white hover:bg-blue-700">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Continue
                            </Button>
                        )}
                        {step === "mapping" && (
                            <Button type="button" onClick={proceedFromMapping} disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Continue
                            </Button>
                        )}
                        {step === "preview" && (
                            <Button
                                type="button"
                                onClick={confirmImport}
                                disabled={loading || (requireGdpr && !gdprConfirmed) || (stats?.valid ?? 0) === 0}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirm import
                            </Button>
                        )}
                        {step === "result" && (
                            <>
                                <Button type="button" variant="outline" onClick={reset} className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                                    Import another
                                </Button>
                                <Button type="button" onClick={() => handleClose(false)} className="bg-blue-600 text-white hover:bg-blue-700">
                                    Done
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className={`text-lg font-semibold ${accent || "text-white"}`}>{value.toLocaleString()}</div>
        </div>
    );
}
