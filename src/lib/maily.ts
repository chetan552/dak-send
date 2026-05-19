/**
 * Maily.to integration adapter for DakSend.
 *
 * Single chokepoint for all Maily-specific concerns:
 *   - The variable suggestion list (DakSend's universal tokens).
 *   - Image upload bridge to /api/upload.
 *   - JSON → HTML rendering with DakSend's `[X]`-token output format.
 *
 * Why route through here: if @maily-to/* needs to be swapped or forked,
 * only this file changes. The campaign form imports `MailyEditor` from
 * the wrapper component and `renderMailyToHtml` from here; nothing else
 * touches the Maily packages directly.
 */

import type { JSONContent } from "@tiptap/core";
import { render } from "@maily-to/render";
import type { VariableItem } from "@maily-to/core";

type Variable = VariableItem;

// ── DakSend's universal personalization tokens ──────────────────────────────
//
// The render pipeline in src/lib/email-render.ts substitutes these at send
// time, per-recipient. The IDs here MUST match the regex names there exactly.
export const DEFAULT_VARIABLES: Variable[] = [
    { id: "Name", required: false },
    { id: "Email", required: true },
    { id: "UnsubscribeUrl", required: false },
    { id: "Unsubscribe", required: false },
    { id: "PreferencesUrl", required: false },
];

/**
 * Build the variable list shown in the slash/`@` picker.
 *
 * The list always contains the universal tokens. When a list with known
 * custom field names is selected on the campaign form, those appear as
 * `CustomField:<name>` entries so users can pick them by name. Users can
 * still type any other variable name and Maily's `filterVariableSuggestions`
 * will offer a "create new" entry.
 */
export function buildVariableList(customFieldNames: string[] = []): Variable[] {
    const customs: Variable[] = customFieldNames.map((name) => ({
        id: `CustomField:${name}`,
        required: false,
    }));
    return [...DEFAULT_VARIABLES, ...customs];
}

/**
 * Render Maily TipTap JSON to email-safe HTML.
 *
 * The `variableFormatter` callback is what makes this DakSend-compatible:
 * every variable node renders to `[<id>]`, which the existing
 * `applyPersonalization` regex in src/lib/email-render.ts substitutes at
 * send time. Result: the worker stays untouched and the same personalization
 * pipeline works for legacy HTML campaigns and new Maily campaigns.
 */
export async function renderMailyToHtml(json: JSONContent): Promise<string> {
    return render(json, {
        variableFormatter: ({ variable }) => `[${variable}]`,
    });
}

/**
 * Upload a file via DakSend's /api/upload endpoint. Wired into Maily's
 * ImageUploadExtension so drag/drop and paste-image gestures route to the
 * same place the existing rich-text-editor uses.
 */
export async function uploadEditorImage(file: File): Promise<string> {
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

    if (!ALLOWED.includes(file.type)) {
        throw new Error("Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.");
    }
    if (file.size > MAX_SIZE) {
        throw new Error("File too large. Maximum size is 5MB.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload image");
    }
    const json = await res.json();
    if (!json.url) throw new Error("Upload returned no URL");
    return json.url as string;
}

/** Empty Maily document — used when initializing a brand-new Maily campaign. */
export const EMPTY_MAILY_DOC: JSONContent = {
    type: "doc",
    content: [{ type: "paragraph" }],
};
