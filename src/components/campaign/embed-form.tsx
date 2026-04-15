"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface CustomField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options: string | null;
}

interface EmbedFormProps {
    listId: string;
    requireGdpr?: boolean;
    customFields?: CustomField[];
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    hideTrigger?: boolean;
}

export function EmbedForm({ listId, requireGdpr = false, customFields = [], open, onOpenChange, hideTrigger = false }: EmbedFormProps) {
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const appUrl = mounted && typeof window !== 'undefined' ? window.location.origin : "";

    const htmlSnippet = `<form action="${appUrl}/api/subscribe" method="POST" style="max-width: 400px; margin: 0 auto; font-family: sans-serif;">
  <input type="hidden" name="listId" value="${listId}" />
  <input type="hidden" name="redirectUrl" value="${appUrl}" /> <!-- Optional: Change to your thank you page -->
  
  <div style="margin-bottom: 1rem;">
    <label for="email" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Email Address</label>
    <input type="email" id="email" name="email" required style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" />
  </div>

  <div style="margin-bottom: 1rem;">
    <label for="name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">First Name (Optional)</label>
    <input type="text" id="name" name="name" style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" />
  </div>
${customFields.map(cf => {
        const requiredAttr = cf.required ? 'required' : '';
        const labelAsterisk = cf.required ? ' *' : '';
        const inputStyle = 'width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;';

        let inputField = '';

        if (cf.type === 'select') {
            const optionsList = cf.options?.split(',').map(opt => `<option value="${opt.trim()}">${opt.trim()}</option>`).join('\n      ') || '';
            inputField = `<select id="cf_${cf.id}" name="cf_${cf.id}" style="${inputStyle}" ${requiredAttr}>
      <option value="" disabled selected>Select ${cf.name.toLowerCase()}</option>
      ${optionsList}
    </select>`;
        } else {
            const inputType = cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text';
            inputField = `<input type="${inputType}" id="cf_${cf.id}" name="cf_${cf.id}" style="${inputStyle}" ${requiredAttr} />`;
        }

        return `
  <div style="margin-bottom: 1rem;">
    <label for="cf_${cf.id}" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">${cf.name}${labelAsterisk}</label>
    ${inputField}
  </div>`;
    }).join("")}
${requireGdpr ? `  <div style="margin-bottom: 1rem; display: flex; align-items: start; gap: 0.5rem;">
    <input type="checkbox" id="gdpr" name="gdpr" required style="margin-top: 0.25rem;" />
    <label for="gdpr" style="font-size: 0.875rem;">I consent to receive emails and agree to the privacy policy. *</label>
  </div>
` : ''}  <button type="submit" style="background-color: #0f172a; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Subscribe</button>
</form>`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(htmlSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {!hideTrigger && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Code className="h-4 w-4" />
                        Embed Form
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Embed Form</DialogTitle>
                    <DialogDescription>
                        Copy this HTML snippet and paste it into your website to collect subscribers.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative mt-2">
                    <pre className="p-4 rounded-md bg-zinc-950 text-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm overflow-x-auto whitespace-pre-wrap break-all">
                        <code>{htmlSnippet}</code>
                    </pre>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={copyToClipboard}
                        title="Copy code"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                    <p>Tip: You can customize the styles and add fields if needed. Be sure to keep the <strong>listId</strong> input intact.</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
