"use client";

import { useState } from "react";
import { createCustomField, deleteCustomField } from "@/app/actions/custom-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Check } from "lucide-react";

export function CustomFieldsManager({ listId, customFields }: { listId: string, customFields: any[] }) {
    const [name, setName] = useState("");
    const [type, setType] = useState("text");
    const [required, setRequired] = useState(false);
    const [options, setOptions] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name) return;
        if (type === 'select' && !options.trim()) {
            alert("Please provide at least one option for select fields.");
            return;
        }

        setIsLoading(true);
        try {
            await createCustomField({ listId, name, type, required, options: type === 'select' ? options : undefined });
            setName("");
            setType("text");
            setRequired(false);
            setOptions("");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="grid gap-2 flex-1">
                    <label className="text-sm font-medium">Field Name</label>
                    <Input placeholder="e.g., Age, Company" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid gap-2 w-full sm:w-48">
                    <label className="text-sm font-medium">Data Type</label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="select">Dropdown (Select)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {type === 'select' && (
                    <div className="grid gap-2 flex-1">
                        <label className="text-sm font-medium">Options (comma-separated)</label>
                        <Input placeholder="e.g. USA, Canada, Mexico" value={options} onChange={e => setOptions(e.target.value)} required={type === 'select'} />
                    </div>
                )}
                <div className="flex items-center gap-2 pb-2 mr-2">
                    <Switch id="required" checked={required} onCheckedChange={setRequired} />
                    <Label htmlFor="required" className="text-sm">Required</Label>
                </div>
                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Add Field
                </Button>
            </form>

            <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Field Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Required</TableHead>
                            <TableHead>Options</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customFields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-zinc-500 py-8">No custom fields defined yet.</TableCell>
                            </TableRow>
                        ) : customFields.map((field) => (
                            <TableRow key={field.id}>
                                <TableCell className="font-medium">{field.name}</TableCell>
                                <TableCell className="capitalize">{field.type}</TableCell>
                                <TableCell>
                                    {field.required ? <Check className="w-4 h-4 text-green-500" /> : <span className="text-zinc-400">-</span>}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-zinc-500 text-sm">
                                    {field.type === 'select' ? field.options : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => deleteCustomField(field.id, listId)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
