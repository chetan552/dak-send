"use client";

import "@maily-to/core/style.css";

import { useMemo, useState } from "react";
import { Editor, Toolbar } from "@maily-to/core";
import {
    VariableExtension,
    ImageUploadExtension,
    SlashCommandExtension,
} from "@maily-to/core/extensions";
import {
    text,
    heading1,
    heading2,
    heading3,
    blockquote,
    bulletList,
    orderedList,
    button,
    image,
    spacer,
    divider,
    columns,
    section,
    footer,
} from "@maily-to/core/blocks";
import type { JSONContent } from "@tiptap/core";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPicker, type ImageInsertMeta } from "@/components/campaign/media-picker";
import { buildVariableList, uploadEditorImage } from "@/lib/maily";

interface MailyEditorProps {
    /**
     * Initial editor content. Accepts Maily TipTap JSON, or an HTML string —
     * if HTML, TipTap parses it on mount. Changing this prop does NOT re-load
     * content into a mounted editor; remount via a `key` prop on the parent.
     */
    value: JSONContent | string;
    onChange: (json: JSONContent) => void;
    customFieldNames?: string[];
}

/**
 * DakSend wrapper around Maily.to's compound editor.
 *
 * Responsibilities beyond what the @maily-to/core package gives us:
 *   - Seed the variable picker with DakSend's universal personalization
 *     tokens ([Name], [Email], [UnsubscribeUrl], etc.) and any custom field
 *     names for the active list.
 *   - Bridge image uploads (drag, paste, slash command) to /api/upload.
 *   - Add a "Browse Media Library" toolbar button that opens the existing
 *     MediaPicker modal so users can pick already-uploaded images.
 *
 * Out of scope here: HTML rendering. The campaign form derives HTML from
 * the JSON via `renderMailyToHtml` in src/lib/maily.ts when it needs to
 * feed the review panel / AI subject generator / save action.
 */
export function MailyEditor({ value, onChange, customFieldNames = [] }: MailyEditorProps) {
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

    const variables = useMemo(() => buildVariableList(customFieldNames), [customFieldNames]);

    const extensions = useMemo(
        () => [
            VariableExtension.configure({ variables }),
            ImageUploadExtension.configure({
                onImageUpload: async (file) => {
                    return await uploadEditorImage(file);
                },
                onImageUploadError: (err, _file, context) => {
                    console.error("Maily image upload failed:", err);
                    context.removeImage();
                },
            }),
            SlashCommandExtension.configure({
                commands: [
                    {
                        title: "Text",
                        commands: [text, heading1, heading2, heading3, blockquote, bulletList, orderedList],
                    },
                    {
                        title: "Layout",
                        commands: [spacer, divider, columns, section, footer],
                    },
                    {
                        title: "Media",
                        commands: [image, button],
                    },
                ],
            }),
        ],
        [variables]
    );

    const handleInsertImageFromLibrary = (
        url: string,
        _filename: string,
        meta: ImageInsertMeta,
    ) => {
        // Media-library inserts append an image node at the end of the doc.
        // Users who want fine-grained placement can drag the image into the
        // document from any other source. If `value` is still an HTML string
        // (i.e. the editor was just initialised from a template and the user
        // hasn't typed yet), we can't safely splice — skip and close.
        if (typeof value === "string") {
            setMediaPickerOpen(false);
            return;
        }
        const altText = meta.alt || "";
        const newImageNode: JSONContent = {
            type: "image",
            attrs: { src: url, alt: altText },
        };
        const next: JSONContent = {
            ...value,
            content: [...(value.content || []), newImageNode],
        };
        onChange(next);
        setMediaPickerOpen(false);
    };

    return (
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
            <Editor.Root
                content={value}
                extensions={extensions}
                onUpdate={({ editor }) => {
                    onChange(editor.getJSON());
                }}
                immediatelyRender={false}
            >
                <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 px-2 py-1 flex items-center gap-1 flex-wrap">
                    <Toolbar.Root>
                        <Toolbar.CommonActions />
                        <Toolbar.Align />
                    </Toolbar.Root>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMediaPickerOpen(true)}
                        className="px-2 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        title="Browse Media Library"
                    >
                        <ImageIcon className="h-4 w-4" />
                    </Button>
                </div>
                <Editor.Frame>
                    <Editor.Content />
                </Editor.Frame>
            </Editor.Root>

            <MediaPicker
                open={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                onSelect={handleInsertImageFromLibrary}
            />
        </div>
    );
}
