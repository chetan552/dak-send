"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import { Markdown } from 'tiptap-markdown';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Toggle } from "@/components/ui/toggle";
import { DOMParser } from '@tiptap/pm/model';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, Link as LinkIcon, Heading2, Heading3, Quote,
    Image as ImageIcon, Loader2, AlignLeft, AlignCenter, AlignRight, Type
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveTemplate } from "@/app/actions/templates";
import { Extension, Node, Mark, mergeAttributes } from '@tiptap/core';
import dynamic from 'next/dynamic';
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });
import { html } from '@codemirror/lang-html';
import { useTheme } from 'next-themes';
import { MediaPicker, AttrFieldsRow, type ImageInsertMeta } from '@/components/campaign/media-picker';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (fontSize: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (fontSize: string) =>
                ({ chain }: any) =>
                    chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize:
                () =>
                ({ chain }: any) =>
                    chain()
                        .setMark('textStyle', { fontSize: null })
                        .removeEmptyTextStyle()
                        .run(),
        };
    },
});

// Custom Node for <div> tags to prevent layout destruction
const Div = Node.create({
    name: 'div',
    group: 'block',
    content: 'block*',
    parseHTML() {
        return [{ tag: 'div' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});

// Custom Node for <center> tags to prevent layout destruction
const Center = Node.create({
    name: 'center',
    group: 'block',
    content: 'block*',
    parseHTML() {
        return [{ tag: 'center' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['center', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});

// Custom Mark for <span> tags to prevent layout destruction
const Span = Mark.create({
    name: 'span',
    parseHTML() {
        return [{ tag: 'span' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});

// Custom extension to allow parsing and rendering global HTML attributes often found in email templates
const GlobalAttributes = Extension.create({
    name: 'globalAttributes',
    addGlobalAttributes() {
        return [
            {
                types: ['textStyle', 'paragraph', 'heading', 'table', 'tableRow', 'tableCell', 'tableHeader', 'image', 'link', 'bulletList', 'orderedList', 'listItem', 'blockquote'],
                attributes: {
                    style: {
                        default: null,
                        parseHTML: element => element.getAttribute('style'),
                        renderHTML: attributes => {
                            if (!attributes.style) return {};
                            return { style: attributes.style };
                        },
                    },
                    class: {
                        default: null,
                        parseHTML: element => element.getAttribute('class'),
                        renderHTML: attributes => {
                            if (!attributes.class) return {};
                            return { class: attributes.class };
                        },
                    },
                    id: {
                        default: null,
                        parseHTML: element => element.getAttribute('id'),
                        renderHTML: attributes => {
                            if (!attributes.id) return {};
                            return { id: attributes.id };
                        },
                    },
                    align: {
                        default: null,
                        parseHTML: element => element.getAttribute('align'),
                        renderHTML: attributes => {
                            if (!attributes.align) return {};
                            return { align: attributes.align };
                        },
                    },
                    valign: {
                        default: null,
                        parseHTML: element => element.getAttribute('valign'),
                        renderHTML: attributes => {
                            if (!attributes.valign) return {};
                            return { valign: attributes.valign };
                        },
                    },
                    bgcolor: {
                        default: null,
                        parseHTML: element => element.getAttribute('bgcolor'),
                        renderHTML: attributes => {
                            if (!attributes.bgcolor) return {};
                            return { bgcolor: attributes.bgcolor };
                        },
                    },
                    width: {
                        default: null,
                        parseHTML: element => element.getAttribute('width'),
                        renderHTML: attributes => {
                            if (!attributes.width) return {};
                            return { width: attributes.width };
                        },
                    },
                    height: {
                        default: null,
                        parseHTML: element => element.getAttribute('height'),
                        renderHTML: attributes => {
                            if (!attributes.height) return {};
                            return { height: attributes.height };
                        },
                    },
                    cellpadding: {
                        default: null,
                        parseHTML: element => element.getAttribute('cellpadding'),
                        renderHTML: attributes => {
                            if (!attributes.cellpadding) return {};
                            return { cellpadding: attributes.cellpadding };
                        },
                    },
                    cellspacing: {
                        default: null,
                        parseHTML: element => element.getAttribute('cellspacing'),
                        renderHTML: attributes => {
                            if (!attributes.cellspacing) return {};
                            return { cellspacing: attributes.cellspacing };
                        },
                    },
                    border: {
                        default: null,
                        parseHTML: element => element.getAttribute('border'),
                        renderHTML: attributes => {
                            if (!attributes.border) return {};
                            return { border: attributes.border };
                        },
                    },
                },
            },
        ];
    },
});

// Simple HTML pretty-formatter
function prettyFormatHtml(html: string): string {
    // Remove existing extra whitespace between tags
    let formatted = html.replace(/\>\s+\</g, '><');

    const selfClosingTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const result: string[] = [];
    let indent = 0;
    const tab = '  ';

    // Split by tags
    const tokens = formatted.match(/(<[^>]+>|[^<]+)/g) || [];

    for (const token of tokens) {
        const trimmed = token.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('</')) {
            // Closing tag
            indent = Math.max(0, indent - 1);
            result.push(tab.repeat(indent) + trimmed);
        } else if (trimmed.startsWith('<')) {
            // Check for self-closing or void tags
            const tagName = (trimmed.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/) || [])[1]?.toLowerCase();
            const isSelfClosing = trimmed.endsWith('/>') || (tagName && selfClosingTags.has(tagName));
            const isComment = trimmed.startsWith('<!--');
            const isDoctype = trimmed.startsWith('<!') && !isComment;

            result.push(tab.repeat(indent) + trimmed);

            if (!isSelfClosing && !isComment && !isDoctype && !trimmed.startsWith('</')) {
                indent++;
            }
        } else {
            // Text content
            result.push(tab.repeat(indent) + trimmed);
        }
    }

    return result.join('\n');
}

// Upload helper function
async function uploadImageFile(file: File): Promise<{ url: string } | { error: string }> {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

    if (!ALLOWED.includes(file.type)) {
        return { error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.' };
    }
    if (file.size > MAX_SIZE) {
        return { error: 'File too large. Maximum size is 5MB.' };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { error: data.error || 'Failed to upload image' };
    }

    return await response.json();
}

/**
 * Strip the HTML document wrapper (<!DOCTYPE>, <html>, <head>, <body>) while
 * preserving body content and any <style> blocks from the <head>.
 * Uses window.DOMParser explicitly to avoid collision with TipTap's DOMParser import.
 */
function cleanHtml(html: string): string {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Collect <style> blocks from <head>
    const headStyles = Array.from(doc.querySelectorAll('head style'))
        .map(el => (el as HTMLStyleElement).outerHTML)
        .join('\n');

    // Get body content (preserves inline styles, classes, attributes)
    const bodyContent = doc.body.innerHTML.trim();

    return headStyles ? `${headStyles}\n${bodyContent}` : bodyContent;
}

const TEMPLATE_CATEGORIES = ['Custom', 'Newsletter', 'Marketing', 'E-commerce', 'Personal', 'Onboarding', 'Events', 'Engagement'];

function SaveAsTemplateDialog({ open, onClose, html }: { open: boolean; onClose: () => void; html: string }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Custom');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const reset = () => {
        setName(''); setCategory('Custom'); setDescription('');
        setIsPublic(false); setError(''); setSuccess(false);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Template name is required.'); return; }
        setSaving(true); setError('');
        try {
            await saveTemplate({ name: name.trim(), category, description: description.trim(), html, isPublic });
            setSuccess(true);
            setTimeout(() => { handleClose(); }, 1200);
        } catch (err: any) {
            setError(err.message || 'Failed to save template.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-white">Save as Template</DialogTitle>
                </DialogHeader>
                {success ? (
                    <div className="py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-zinc-900 dark:text-white font-medium">Template saved!</p>
                        <p className="text-sm text-zinc-500 mt-1">Available in your Template Library.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Template Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Monthly Newsletter"
                                autoFocus
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                >
                                    {TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Share with team</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description <span className="text-zinc-400 font-normal">(optional)</span></label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Short description of this template"
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saving…</> : 'Save Template'}
                            </button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function EditImageDialog({
    open, onClose, editor, iframeImg, onIframeSave,
}: {
    open: boolean;
    onClose: () => void;
    editor: any | null;
    iframeImg?: HTMLImageElement | null;
    onIframeSave?: () => void;
}) {
    const [alt, setAlt] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');

    // Load current attributes whenever the dialog opens
    useEffect(() => {
        if (!open) return;
        if (iframeImg) {
            setAlt(iframeImg.getAttribute('alt') || '');
            setWidth(iframeImg.getAttribute('width') || '');
            setHeight(iframeImg.getAttribute('height') || '');
        } else if (editor) {
            const attrs = editor.getAttributes('image') || {};
            setAlt(attrs.alt || '');
            setWidth(attrs.width || '');
            setHeight(attrs.height || '');
        }
    }, [open, editor, iframeImg]);

    const handleSave = () => {
        const a = alt.trim();
        const w = width.trim();
        const h = height.trim();

        if (iframeImg) {
            iframeImg.setAttribute('alt', a);
            iframeImg.setAttribute('title', a);
            if (w) iframeImg.setAttribute('width', w);
            else iframeImg.removeAttribute('width');
            if (h) iframeImg.setAttribute('height', h);
            else iframeImg.removeAttribute('height');
            onIframeSave?.();
        } else if (editor) {
            editor.chain().focus().updateAttributes('image', {
                alt: a,
                title: a,
                width: w || null,
                height: h || null,
            }).run();
        }
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-white">Edit Image</DialogTitle>
                </DialogHeader>
                <div className="pt-2">
                    <AttrFieldsRow
                        alt={alt} setAlt={setAlt}
                        width={width} setWidth={setWidth}
                        height={height} setHeight={setHeight}
                        className="py-2"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors"
                    >
                        Save
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const COLOR_SWATCHES = [
    // Neutrals
    '#ffffff', '#f4f4f5', '#e4e4e7', '#a1a1aa', '#52525b', '#18181b',
    // Reds
    '#fef2f2', '#fecaca', '#f87171', '#ef4444', '#dc2626', '#991b1b',
    // Oranges / Yellows
    '#fffbeb', '#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#92400e',
    // Greens
    '#f0fdf4', '#bbf7d0', '#4ade80', '#22c55e', '#16a34a', '#14532d',
    // Blues
    '#eff6ff', '#bfdbfe', '#60a5fa', '#3b82f6', '#2563eb', '#1e40af',
    // Purples
    '#faf5ff', '#e9d5ff', '#a78bfa', '#8b5cf6', '#7c3aed', '#5b21b6',
];

function ColorPickerButton({
    editor,
    isHtmlMode,
    iframeMode = false,
    onIframeStyle,
}: {
    editor: any;
    isHtmlMode: boolean;
    iframeMode?: boolean;
    onIframeStyle?: (cssProp: string, cssVal: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [hexInput, setHexInput] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const currentColor = (!isHtmlMode && !iframeMode && editor?.getAttributes('textStyle')?.color) || null;
    const disabled = isHtmlMode || (!editor && !iframeMode);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const applyColor = (color: string) => {
        if (iframeMode) {
            onIframeStyle?.('color', color);
        } else {
            editor?.chain().focus().setColor(color).run();
        }
        setOpen(false);
    };

    const applyHex = () => {
        const val = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
        if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
            applyColor(val);
            setHexInput('');
        }
    };

    // Prevent focus theft from iframe on every interactive element in the picker
    const noFocusTheft = (e: React.MouseEvent) => { if (iframeMode) e.preventDefault(); };

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                title="Text color"
                disabled={disabled}
                onMouseDown={noFocusTheft}
                onClick={() => !disabled && setOpen(o => !o)}
                className={`flex flex-col items-center justify-center w-8 h-8 rounded transition-colors disabled:opacity-50 ${open ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
            >
                <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M7.27 1.2a.8.8 0 0 1 1.46 0l4.8 10.4a.8.8 0 0 1-1.46.67L10.5 9.6H5.5l-1.57 2.67a.8.8 0 1 1-1.46-.67L7.27 1.2zM6.3 8h3.4L8 4.47 6.3 8z"/>
                </svg>
                <span
                    className="w-4 h-1 rounded-sm mt-0.5"
                    style={{ backgroundColor: currentColor || '#000000' }}
                />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-3 w-52">
                    {/* Swatch grid */}
                    <div className="grid grid-cols-6 gap-1 mb-3">
                        {COLOR_SWATCHES.map(color => (
                            <button
                                key={color}
                                type="button"
                                title={color}
                                onMouseDown={noFocusTheft}
                                onClick={() => applyColor(color)}
                                className={`w-6 h-6 rounded border transition-transform hover:scale-110 ${currentColor?.toLowerCase() === color ? 'ring-2 ring-offset-1 ring-zinc-500 dark:ring-zinc-300' : 'border-zinc-200 dark:border-zinc-700'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>

                    {/* Hex input */}
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-6 h-6 flex-shrink-0 rounded border border-zinc-200 dark:border-zinc-700"
                            style={{ backgroundColor: hexInput ? (hexInput.startsWith('#') ? hexInput : `#${hexInput}`) : (currentColor || '#000000') }}
                        />
                        <input
                            type="text"
                            placeholder="#000000"
                            value={hexInput}
                            maxLength={7}
                            onChange={e => setHexInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyHex()}
                            className="flex-1 min-w-0 h-7 px-2 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <button
                            type="button"
                            onMouseDown={noFocusTheft}
                            onClick={applyHex}
                            className="text-xs px-2 h-7 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors"
                        >
                            Set
                        </button>
                    </div>

                    {/* Remove color */}
                    {currentColor && (
                        <button
                            type="button"
                            onMouseDown={noFocusTheft}
                            onClick={() => {
                                if (!iframeMode) editor?.chain().focus().unsetColor().run();
                                setOpen(false);
                            }}
                            className="mt-2 w-full text-xs text-center py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                        >
                            Remove color
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// Define the toolbar buttons configuration
interface ToolbarProps {
    editor: any;
    isHtmlMode: boolean;
    onToggleMode: () => void;
    onFormat?: () => void;
    onClean?: () => void;
    onSaveAsTemplate?: () => void;
    onOpenMediaPicker: () => void;
    onEditImage?: () => void;
    isComplexHtml: boolean;
    iframeImageSelected?: boolean;
    onIframeCommand?: (command: string, value?: string) => void;
    onIframeStyle?: (cssProp: string, cssVal: string) => void;
}

const Toolbar = ({ editor, isHtmlMode, onToggleMode, onFormat, onClean, onSaveAsTemplate, onOpenMediaPicker, onEditImage, isComplexHtml, iframeImageSelected, onIframeCommand, onIframeStyle }: ToolbarProps) => {
    // True when the content is shown inside the iframe (not TipTap, not raw source)
    const iframeMode = isComplexHtml && !isHtmlMode;
    const isImageSelected = (!isHtmlMode && !iframeMode && editor?.isActive('image')) ||
                            (iframeMode && !!iframeImageSelected);

    const fontFamilies = [
        { name: 'Default', value: '' },
        { name: 'Arial', value: 'Arial' },
        { name: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans"' },
        { name: 'Courier New', value: '"Courier New", Courier, monospace' },
        { name: 'Georgia', value: 'Georgia, serif' },
        { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
        { name: 'Inter', value: 'Inter, sans-serif' },
        { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
        { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
        { name: 'Verdana', value: 'Verdana, sans-serif' },
    ];

    const fontSizes = [
        { name: 'Default', value: '' },
        { name: '10px', value: '10px' },
        { name: '12px', value: '12px' },
        { name: '14px', value: '14px' },
        { name: '16px', value: '16px' },
        { name: '18px', value: '18px' },
        { name: '20px', value: '20px' },
        { name: '24px', value: '24px' },
        { name: '30px', value: '30px' },
        { name: '36px', value: '36px' },
        { name: '48px', value: '48px' },
        { name: '60px', value: '60px' },
    ];

    const handleFontFamilyChange = (value: string) => {
        if (iframeMode) {
            if (value && value !== 'Default') onIframeStyle?.('fontFamily', value);
            return;
        }
        if (!editor) return;
        if (value && value !== 'Default') {
            editor.chain().focus().setFontFamily(value).run();
        } else {
            editor.chain().focus().unsetFontFamily().run();
        }
    };

    const handleFontSizeChange = (value: string) => {
        if (iframeMode) {
            if (value && value !== 'Default') onIframeStyle?.('fontSize', value);
            return;
        }
        if (!editor) return;
        if (value && value !== 'Default') {
            editor.chain().focus().setFontSize(value).run();
        } else {
            editor.chain().focus().unsetFontSize().run();
        }
    };

    const currentFontFamily = editor?.getAttributes('textStyle')?.fontFamily || '';
    const currentFontSize = editor?.getAttributes('textStyle')?.fontSize || '';

    return (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2 flex gap-1 rounded-t-md items-start justify-between sticky top-0 z-10">
            <div className="flex flex-wrap gap-1 items-center flex-1 min-w-0">
                <Select value={currentFontFamily} onValueChange={handleFontFamilyChange} disabled={isHtmlMode || (!editor && !iframeMode)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                        {fontFamilies.map((font) => (
                            <SelectItem key={font.name} value={font.value || 'Default'} style={{ fontFamily: font.value || 'inherit' }}>
                                {font.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={currentFontSize} onValueChange={handleFontSizeChange} disabled={isHtmlMode || (!editor && !iframeMode)}>
                    <SelectTrigger className="w-[80px] h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                        <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                        {fontSizes.map((size) => (
                            <SelectItem key={size.name} value={size.value || 'Default'}>
                                {size.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('bold')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('bold'); return; }
                        editor?.chain().focus().toggleBold().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('italic')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('italic'); return; }
                        editor?.chain().focus().toggleItalic().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('underline')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('underline'); return; }
                        editor?.chain().focus().toggleUnderline().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('strike')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('strikeThrough'); return; }
                        editor?.chain().focus().toggleStrike().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Strikethrough className="h-4 w-4" />
                </Toggle>

                {/* Text Color */}
                <ColorPickerButton
                    editor={editor}
                    isHtmlMode={isHtmlMode}
                    iframeMode={iframeMode}
                    onIframeStyle={onIframeStyle}
                />

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('heading', { level: 2 })}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('formatBlock', 'h2'); return; }
                        editor?.chain().focus().toggleHeading({ level: 2 }).run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Heading2 className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('heading', { level: 3 })}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('formatBlock', 'h3'); return; }
                        editor?.chain().focus().toggleHeading({ level: 3 }).run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Heading3 className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('blockquote')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('formatBlock', 'blockquote'); return; }
                        editor?.chain().focus().toggleBlockquote().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Quote className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('bulletList')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('insertUnorderedList'); return; }
                        editor?.chain().focus().toggleBulletList().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('orderedList')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('insertOrderedList'); return; }
                        editor?.chain().focus().toggleOrderedList().run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                {/* Text Alignment */}
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive({ textAlign: 'left' })}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('justifyLeft'); return; }
                        editor?.chain().focus().setTextAlign('left').run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive({ textAlign: 'center' })}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('justifyCenter'); return; }
                        editor?.chain().focus().setTextAlign('center').run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive({ textAlign: 'right' })}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) { onIframeCommand?.('justifyRight'); return; }
                        editor?.chain().focus().setTextAlign('right').run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!iframeMode && !isHtmlMode && editor?.isActive('link')}
                    disabled={isHtmlMode || (!editor && !iframeMode)}
                    onMouseDown={(e) => { if (iframeMode) e.preventDefault(); }}
                    onPressedChange={() => {
                        if (iframeMode) {
                            const url = window.prompt('URL');
                            if (url) onIframeCommand?.('createLink', url);
                            return;
                        }
                        if (!editor) return;
                        const previousUrl = editor.getAttributes('link').href;
                        const url = window.prompt('URL', previousUrl);
                        if (url === null) return;
                        if (url === '') {
                            editor.chain().focus().extendMarkRange('link').unsetLink().run();
                            return;
                        }
                        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                    }}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <LinkIcon className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isHtmlMode || !editor}
                    onClick={onOpenMediaPicker}
                    className="px-2 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Insert Image from Media Library"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>

                {/* Image-specific controls (shown when image is selected) */}
                {isImageSelected && (
                    <>
                        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); onEditImage?.(); }}
                            className="px-2 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs gap-1"
                            title="Edit image alt text and size"
                        >
                            <Type className="h-3 w-3" /> Edit Image
                        </Button>
                    </>
                )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                {isHtmlMode && onFormat && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); onFormat(); }}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white gap-1.5 px-2"
                        title="Format HTML"
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path></svg>
                        <span className="hidden sm:inline">Format</span>
                    </Button>
                )}
                {onSaveAsTemplate && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); onSaveAsTemplate(); }}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white gap-1.5 px-2"
                        title="Save current HTML as a reusable template"
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        <span className="hidden sm:inline">Save as Template</span>
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.preventDefault(); onToggleMode(); }}
                    className={`gap-1.5 px-2 ${isHtmlMode ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}`}
                    title={isHtmlMode ? "View Visual editor" : "View HTML source"}
                >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    <span className="hidden sm:inline">{isHtmlMode ? "View Visual" : "View Source"}</span>
                </Button>
                {isComplexHtml && onClean && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); onClean(); }}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-1.5 px-2"
                        title="Remove <!DOCTYPE>, <html>, <head>, <body> wrappers and keep body content + styles"
                    >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="hidden sm:inline">Clean HTML</span>
                    </Button>
                )}
                
            </div>
        </div >
    );
};

interface RichTextEditorProps {
    value: string;
    onChange: (richText: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const isComplexHtml = useCallback((htmlStr: string) => {
        const v = (htmlStr || '').trim().toLowerCase();
        // Full document wrapper — TipTap can't represent <html>/<head>/<body>
        if (v.startsWith('<!doctype') || v.startsWith('<html') || v.includes('<body')) return true;
        // <style> blocks — TipTap strips these, so render in iframe to preserve CSS classes
        if (/<style[\s>]/i.test(htmlStr)) return true;
        // MSO conditional comments — Outlook-specific markup TipTap would lose
        if (/<!--\s*\[if\s+(mso|gte mso|lte mso|!mso)/i.test(htmlStr)) return true;
        return false;
    }, []);

    const [isHtmlMode, setIsHtmlMode] = useState(() => isComplexHtml(value));
    const [prevValueProp, setPrevValueProp] = useState(value);

    // Track whether the user has explicitly toggled mode
    const userExplicitMode = useRef(false);
    // Stores the last value the editor itself produced via onChange, so we can
    // distinguish "prop changed because the editor emitted it" from "prop changed
    // because a template was loaded externally". Value-based — no timing issues
    // between render phase and effect phase.
    const lastSelfValue = useRef<string | null>(null);
    // Stable ref for onChange to avoid re-running effects on every parent render
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Auto-switch to source mode only for external loads (template picker),
    // never during active user editing.
    if (value !== prevValueProp) {
        setPrevValueProp(value);
        const isSelfChange = value === lastSelfValue.current;
        if (!isSelfChange && !userExplicitMode.current && isComplexHtml(value) && !isHtmlMode) {
            setIsHtmlMode(true);
        }
    }

    const [isDragging, setIsDragging] = useState(false);
    const [dropUploading, setDropUploading] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [editImageOpen, setEditImageOpen] = useState(false);
    // Tracks whichever <img> element the user last clicked in the iframe.
    const [selectedIframeImg, setSelectedIframeImg] = useState<HTMLImageElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Tracks the last non-collapsed selection inside the iframe so toolbar
    // commands can restore it after toolbar clicks steal focus.
    const savedIframeSelection = useRef<Range | null>(null);
    // Tracks the last cursor position (collapsed OR not) inside the iframe.
    // Used for image insertion where we need to know *where* to place content
    // even if the user just clicked without selecting text.
    const savedIframeCursor = useRef<Range | null>(null);
    const { theme, systemTheme } = useTheme();

    // Ref holding the currently-active drop/paste handler for the iframe doc.
    // Updated each render so the listeners always see the latest `insertImage`
    // closure without needing to re-open the iframe document.
    const iframeUploadHandler = useRef<(file: File) => void>(() => {});

    // Debounce CodeMirror onChange so parent re-renders are throttled while typing.
    // The pending value is held in a ref and flushed on a timer / mode toggle / unmount.
    const codeMirrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const codeMirrorPending = useRef<string | null>(null);
    const flushCodeMirror = useCallback(() => {
        if (codeMirrorTimer.current) {
            clearTimeout(codeMirrorTimer.current);
            codeMirrorTimer.current = null;
        }
        if (codeMirrorPending.current !== null) {
            const val = codeMirrorPending.current;
            codeMirrorPending.current = null;
            onChangeRef.current(val);
        }
    }, []);
    const handleCodeMirrorChange = useCallback((val: string) => {
        lastSelfValue.current = val;
        codeMirrorPending.current = val;
        if (codeMirrorTimer.current) clearTimeout(codeMirrorTimer.current);
        codeMirrorTimer.current = setTimeout(() => {
            codeMirrorTimer.current = null;
            const pending = codeMirrorPending.current;
            codeMirrorPending.current = null;
            if (pending !== null) onChangeRef.current(pending);
        }, 250);
    }, []);
    useEffect(() => {
        return () => flushCodeMirror();
    }, [flushCodeMirror]);

    // Write HTML into iframe for visual preview of complex templates
    const iframeWriting = useRef(false);
    useEffect(() => {
        if (isHtmlMode || !isComplexHtml(value) || !iframeRef.current) return;
        // Skip rewriting if the value change came from the iframe itself
        // (typing, image insertion, etc.). The DOM already reflects the
        // latest content — rewriting would destroy the cursor position.
        if (value === lastSelfValue.current) return;

        // External rewrite — clear any previously-selected iframe image
        setSelectedIframeImg(null);

        const doc = iframeRef.current.contentDocument;
        if (!doc) return;

        iframeWriting.current = true;
        doc.open();
        doc.write(value);
        doc.close();
        if (!doc.body) return;

        doc.body.contentEditable = 'true';
        doc.body.style.outline = 'none';

        // Listener handles — captured so cleanup can detach them on unmount
        // or before the next iframe rewrite. doc.open()/write()/close() above
        // already replaces the document for new content, but on unmount the
        // old listeners would otherwise hold references to React state setters.
        const onInput = () => {
            if (iframeWriting.current) return;
            const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>\n` : '';
            const fullHtml = doctype + doc.documentElement.outerHTML;
            lastSelfValue.current = fullHtml;
            onChangeRef.current(fullHtml);
        };
        const onSelectionChange = () => {
            const sel = doc.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const r = sel.getRangeAt(0);
            savedIframeCursor.current = r.cloneRange();
            if (!sel.isCollapsed) {
                savedIframeSelection.current = r.cloneRange();
            }
        };
        const onDragOver = (e: DragEvent) => {
            if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
            }
        };
        const onDrop = (e: DragEvent) => {
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0) return;
            const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
            if (imageFiles.length === 0) return;
            e.preventDefault();
            imageFiles.forEach(file => iframeUploadHandler.current(file));
        };
        const onPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) iframeUploadHandler.current(file);
                    return;
                }
            }
        };
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
                const img = target as HTMLImageElement;
                doc.querySelectorAll('img').forEach(el => el.style.removeProperty('outline'));
                img.style.outline = '2px solid #3b82f6';
                setSelectedIframeImg(img);
            } else {
                doc.querySelectorAll('img').forEach(el => el.style.removeProperty('outline'));
                setSelectedIframeImg(null);
            }
        };

        doc.body.addEventListener('input', onInput);
        doc.addEventListener('selectionchange', onSelectionChange);
        doc.addEventListener('dragover', onDragOver);
        doc.addEventListener('drop', onDrop);
        doc.addEventListener('paste', onPaste);
        doc.addEventListener('click', onClick);

        // Allow the input listener to fire after initial write
        const raf = requestAnimationFrame(() => { iframeWriting.current = false; });

        return () => {
            cancelAnimationFrame(raf);
            doc.body?.removeEventListener('input', onInput);
            doc.removeEventListener('selectionchange', onSelectionChange);
            doc.removeEventListener('dragover', onDragOver);
            doc.removeEventListener('drop', onDrop);
            doc.removeEventListener('paste', onPaste);
            doc.removeEventListener('click', onClick);
        };
    }, [value, isHtmlMode, isComplexHtml]);

    /** Serialize the iframe's current DOM back to the parent onChange. */
    const syncIframeHtml = useCallback(() => {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        const doctype = iframeDoc.doctype ? `<!DOCTYPE ${iframeDoc.doctype.name}>\n` : '';
        const fullHtml = doctype + iframeDoc.documentElement.outerHTML;
        lastSelfValue.current = fullHtml;
        onChangeRef.current(fullHtml);
    }, []);

    /**
     * Resolve the active range inside the iframe.
     * For Toggle buttons, onMouseDown prevention keeps focus in the iframe so the
     * selection is live. For dropdowns/pickers the saved range is the fallback.
     */
    const resolveIframeRange = useCallback((): Range | null => {
        const iframeDoc = iframeRef.current?.contentDocument;
        const iframeWin = iframeRef.current?.contentWindow;
        if (!iframeDoc || !iframeWin) return null;

        // Try the live selection first (focus stayed in iframe)
        const liveSel = iframeDoc.getSelection();
        if (liveSel && liveSel.rangeCount > 0 && !liveSel.isCollapsed) {
            return liveSel.getRangeAt(0);
        }

        // Fall back: restore the saved range and re-focus
        const saved = savedIframeSelection.current;
        if (!saved) return null;
        iframeWin.focus();
        const sel = iframeDoc.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(saved.cloneRange());
            if (sel.rangeCount > 0 && !sel.isCollapsed) return sel.getRangeAt(0);
        }
        return null;
    }, []);

    /**
     * Apply an execCommand to the iframe's document.
     * Works whether focus stayed in the iframe (Toggle buttons) or not (dropdowns).
     */
    const applyIframeCommand = useCallback((command: string, value?: string) => {
        const iframeDoc = iframeRef.current?.contentDocument;
        const iframeWin = iframeRef.current?.contentWindow;
        if (!iframeDoc || !iframeWin) return;
        // Ensure iframe has focus so execCommand targets the right document
        iframeWin.focus();
        const range = resolveIframeRange();
        if (range) {
            const sel = iframeDoc.getSelection();
            if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        }
        iframeDoc.execCommand(command, false, value ?? undefined);
        syncIframeHtml();
    }, [resolveIframeRange, syncIframeHtml]);

    /**
     * Wrap the active iframe selection in a <span style="prop: val">.
     * Used for font-size, font-family, and color in iframe mode.
     */
    const applyIframeStyle = useCallback((cssProp: string, cssVal: string) => {
        const range = resolveIframeRange();
        if (!range || range.collapsed) return;
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        const fragment = range.extractContents();
        const span = iframeDoc.createElement('span');
        (span.style as any)[cssProp] = cssVal;
        span.appendChild(fragment);
        range.insertNode(span);
        syncIframeHtml();
    }, [resolveIframeRange, syncIframeHtml]);

    const editor = useEditor({
        extensions: [
            GlobalAttributes,
            Div,
            Center,
            Span,
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Underline,
            TextStyle,
            FontFamily,
            FontSize,
            Color,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'campaign-image',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Markdown.configure({
                html: true,
                // Do NOT transform pasted text: users pasting prose that happens to
                // contain `*`, `_`, or `#` would otherwise get unexpected formatting.
                transformPastedText: false,
                transformCopiedText: false,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline',
                },
            }),
        ],
        // Don't initialize Tiptap with complex HTML — it would strip tags
        content: isComplexHtml(value) ? '' : value,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[600px] p-6 bg-white text-black',
            },
            // Handle paste events for images
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                        event.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            handleDropOrPasteUpload(file);
                        }
                        return true;
                    }
                }
                return false;
            },
            // Handle drop events for images
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files;
                if (!files || files.length === 0) return false;

                const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
                if (imageFiles.length === 0) return false;

                event.preventDefault();
                imageFiles.forEach(file => handleDropOrPasteUpload(file));
                return true;
            },
        },
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            // Don't let Tiptap overwrite complex HTML source
            if (!isComplexHtml(value)) {
                const html = editor.getHTML();
                lastSelfValue.current = html;
                onChange(html);
            }
        },
    });

    // Synchronize external value changes to the editor (skip complex HTML and self-changes)
    useEffect(() => {
        if (value === lastSelfValue.current) return;
        if (editor && value !== editor.getHTML()) {
            if (isHtmlMode || isComplexHtml(value)) {
                // Don't push complex HTML or source-mode edits into Tiptap
            } else {
                const el = document.createElement('div');
                el.innerHTML = value;
                const newDoc = DOMParser.fromSchema(editor.schema).parse(el);
                const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, newDoc.content);
                editor.view.dispatch(tr);
            }
        }
    }, [value, editor, isHtmlMode, isComplexHtml]);

    /**
     * Insert an image into whichever view is currently active:
     * - TipTap visual mode → editor.setImage() (width/height round-trip via GlobalAttributes)
     * - Iframe mode (complex HTML) → insert an <img> at the saved range, then sync
     * - HTML source mode → no-op (toolbar already disables the image button)
     */
    const insertImage = useCallback((src: string, meta: ImageInsertMeta) => {
        const alt = (meta.alt ?? '').trim();
        const width = (meta.width ?? '').trim();
        const height = (meta.height ?? '').trim();

        if (isHtmlMode) return;

        if (!isComplexHtml(value)) {
            if (!editor) return;
            editor.chain().focus().setImage({
                src,
                alt,
                title: alt,
                ...(width ? { width } : {}),
                ...(height ? { height } : {}),
            } as any).run();
            return;
        }

        // Iframe mode: insert directly into the iframe document
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        const img = iframeDoc.createElement('img');
        img.setAttribute('src', src);
        if (alt) { img.setAttribute('alt', alt); img.setAttribute('title', alt); }
        if (width) img.setAttribute('width', width);
        if (height) img.setAttribute('height', height);

        // Pick an insertion range. Prefer the live selection (may have survived
        // focus loss as a collapsed cursor), fall back to the cursor we saved
        // via selectionchange, then to the non-collapsed selection used by
        // formatting commands. Only as a last resort append to body.
        let range: Range | null = null;
        const liveSel = iframeDoc.getSelection();
        if (liveSel && liveSel.rangeCount > 0) {
            range = liveSel.getRangeAt(0).cloneRange();
        }
        if (!range && savedIframeCursor.current) {
            range = savedIframeCursor.current.cloneRange();
        }
        if (!range && savedIframeSelection.current) {
            range = savedIframeSelection.current.cloneRange();
        }

        // Ensure the range is still inside the iframe document (it might refer
        // to a node from a previous doc.write cycle).
        if (range && !iframeDoc.contains(range.startContainer)) {
            range = null;
        }

        if (range) {
            range.deleteContents();
            range.insertNode(img);
            const sel = iframeDoc.getSelection();
            if (sel) {
                const after = iframeDoc.createRange();
                after.setStartAfter(img);
                after.collapse(true);
                sel.removeAllRanges();
                sel.addRange(after);
                savedIframeCursor.current = after.cloneRange();
            }
        } else if (iframeDoc.body) {
            iframeDoc.body.appendChild(img);
        }
        syncIframeHtml();
    }, [editor, isHtmlMode, isComplexHtml, value, syncIframeHtml]);

    // Upload handler for drag-drop and paste — routes through insertImage
    const handleDropOrPasteUpload = useCallback(async (file: File) => {
        setDropUploading(true);
        try {
            const result = await uploadImageFile(file);
            if ('error' in result) {
                alert(result.error);
                return;
            }
            const alt = file.name.replace(/\.[^/.]+$/, '');
            insertImage(result.url, { alt });
        } catch (error) {
            console.error('Error uploading dropped/pasted image:', error);
            alert('Failed to upload image.');
        } finally {
            setDropUploading(false);
        }
    }, [insertImage]);

    // Keep the iframe drop/paste listeners pointed at the latest uploader closure
    useEffect(() => {
        iframeUploadHandler.current = (file: File) => { void handleDropOrPasteUpload(file); };
    }, [handleDropOrPasteUpload]);

    const handleToggleMode = () => {
        // Push any pending CodeMirror edits to the parent before switching views
        flushCodeMirror();
        userExplicitMode.current = true;
        setIsHtmlMode(!isHtmlMode);
        if (editor) {
            if (isHtmlMode && !isComplexHtml(value)) {
                // Switching FROM source TO visual — only for simple HTML
                const el = document.createElement('div');
                el.innerHTML = value;
                const newDoc = DOMParser.fromSchema(editor.schema).parse(el);
                const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, newDoc.content);
                editor.view.dispatch(tr);
            }
        }
    };

    const handleFormat = () => {
        onChange(prettyFormatHtml(value));
    };

    const handleClean = () => {
        if (!confirm('Remove <!DOCTYPE>, <html>, <head>, and <body> wrappers?\n\nThe body content and all styles will be preserved. The visual preview will still render correctly via the iframe.')) return;
        const cleaned = cleanHtml(value);
        lastSelfValue.current = null; // allow mode-detection logic to re-evaluate
        onChange(cleaned);
        // cleaned HTML with <style> blocks is still "complex" → stays in iframe view
        // so styles continue to render correctly. Only switch to TipTap if truly simple.
        if (!isComplexHtml(cleaned)) {
            userExplicitMode.current = false;
            setIsHtmlMode(false);
        }
    };

    // Drag and drop handlers for the editor container
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                handleDropOrPasteUpload(file);
            }
        });
    }, [handleDropOrPasteUpload]);

    return (
        <div className="w-full relative shadow-sm">
            <Toolbar editor={editor} isHtmlMode={isHtmlMode} onToggleMode={handleToggleMode} onFormat={handleFormat} onClean={handleClean} onSaveAsTemplate={() => setSaveTemplateOpen(true)} onOpenMediaPicker={() => setMediaPickerOpen(true)} onEditImage={() => setEditImageOpen(true)} isComplexHtml={isComplexHtml(value)} iframeImageSelected={!!selectedIframeImg} onIframeCommand={applyIframeCommand} onIframeStyle={applyIframeStyle} />

            {/* HTML Source View */}
            <div className={!isHtmlMode ? "hidden" : "block"}>
                <div className="w-full bg-white dark:bg-zinc-900 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md overflow-hidden font-mono text-sm">
                    <CodeMirror
                        value={value}
                        height="600px"
                        extensions={[html()]}
                        onChange={handleCodeMirrorChange}
                        theme={theme === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : (theme === 'dark' ? 'dark' : 'light')}
                        className="text-sm"
                    />
                </div>
            </div>

            {/* Visual View */}
            <div className={isHtmlMode ? "hidden" : "block"}>
                {isComplexHtml(value) ? (
                    /* Complex HTML: render in iframe to preserve full source */
                    <div className="border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md overflow-hidden bg-white">
                        <iframe
                            ref={iframeRef}
                            title="Email Preview"
                            sandbox="allow-same-origin"
                            className="w-full bg-white"
                            style={{ height: '600px', border: 'none' }}
                        />
                    </div>
                ) : (
                    /* Simple HTML: Tiptap visual editor */
                    <div
                        className={`relative flex-1 overflow-auto bg-white dark:bg-zinc-950 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md transition-colors ${isDragging ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <EditorContent editor={editor} />

                        {/* Drag overlay */}
                        {isDragging && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-950/80 pointer-events-none z-20 rounded-b-md">
                                <div className="flex flex-col items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <ImageIcon className="w-10 h-10" />
                                    <span className="text-sm font-medium">Drop image here to upload</span>
                                </div>
                            </div>
                        )}

                        {/* Upload indicator for drop/paste */}
                        {dropUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 pointer-events-none z-20 rounded-b-md">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Uploading image...</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Editor styles for images */}
            <style jsx global>{`
                .ProseMirror .campaign-image {
                    max-width: 100%;
                    height: auto;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: box-shadow 0.15s ease;
                }
                .ProseMirror .campaign-image.ProseMirror-selectednode {
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
                }
            `}</style>

            {/* Save as Template Dialog */}
            <SaveAsTemplateDialog
                open={saveTemplateOpen}
                onClose={() => setSaveTemplateOpen(false)}
                html={value}
            />

            {/* Edit Image Dialog */}
            <EditImageDialog
                open={editImageOpen}
                onClose={() => setEditImageOpen(false)}
                editor={editor}
                iframeImg={selectedIframeImg}
                onIframeSave={syncIframeHtml}
            />

            {/* Media Picker Modal */}
            <MediaPicker
                open={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                onSelect={(url, _filename, meta) => {
                    insertImage(url, meta);
                    setMediaPickerOpen(false);
                }}
            />
        </div>
    );
}
