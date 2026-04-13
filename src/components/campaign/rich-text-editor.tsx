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
import { Extension, Node, Mark, mergeAttributes } from '@tiptap/core';
import dynamic from 'next/dynamic';
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });
import { html } from '@codemirror/lang-html';
import { useTheme } from 'next-themes';
import { MediaPicker } from '@/components/campaign/media-picker';

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

// Define the toolbar buttons configuration
interface ToolbarProps {
    editor: any;
    isHtmlMode: boolean;
    onToggleMode: () => void;
    onFormat?: () => void;
    onOpenMediaPicker: () => void;
}

const Toolbar = ({ editor, isHtmlMode, onToggleMode, onFormat, onOpenMediaPicker }: ToolbarProps) => {
    const isImageSelected = !isHtmlMode && editor?.isActive('image');

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
        if (!editor) return;
        if (value && value !== 'Default') {
            editor.chain().focus().setFontFamily(value).run();
        } else {
            editor.chain().focus().unsetFontFamily().run();
        }
    };

    const handleFontSizeChange = (value: string) => {
        if (!editor) return;
        if (value && value !== 'Default') {
            editor.chain().focus().setMark('textStyle', { fontSize: value }).run();
        } else {
            // Using removeEmptyTextStyle helps clear out empty inline styles
            editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        }
    };

    const currentFontFamily = editor?.getAttributes('textStyle')?.fontFamily || '';
    const currentFontSize = editor?.getAttributes('textStyle')?.fontSize || '';

    return (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2 flex flex-wrap gap-1 rounded-t-md items-center justify-between sticky top-0 z-10">
            <div className="flex flex-wrap gap-1 items-center">
                <Select value={currentFontFamily} onValueChange={handleFontFamilyChange} disabled={isHtmlMode || !editor}>
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

                <Select value={currentFontSize} onValueChange={handleFontSizeChange} disabled={isHtmlMode || !editor}>
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
                    size="sm" pressed={!isHtmlMode && editor?.isActive('bold')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleBold().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('italic')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('underline')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleUnderline().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('strike')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleStrike().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Strikethrough className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('heading', { level: 2 })}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Heading2 className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('heading', { level: 3 })}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Heading3 className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('blockquote')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleBlockquote().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <Quote className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('bulletList')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleBulletList().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <List className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('orderedList')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().toggleOrderedList().run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                >
                    <ListOrdered className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                {/* Text Alignment */}
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive({ textAlign: 'left' })}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().setTextAlign('left').run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive({ textAlign: 'center' })}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().setTextAlign('center').run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Toggle>
                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive({ textAlign: 'right' })}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => editor?.chain().focus().setTextAlign('right').run()}
                    className="data-[state=on]:bg-zinc-200 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Toggle>

                <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />

                <Toggle
                    size="sm" pressed={!isHtmlMode && editor?.isActive('link')}
                    disabled={isHtmlMode || !editor}
                    onPressedChange={() => {
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
                            onClick={() => {
                                const currentWidth = editor.getAttributes('image').width;
                                const width = window.prompt('Image width (e.g. 300, 50%, auto):', currentWidth || '');
                                if (width !== null) {
                                    editor.chain().focus().updateAttributes('image', { width: width || null }).run();
                                }
                            }}
                            className="px-2 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs gap-1"
                            title="Resize Image"
                        >
                            <Type className="h-3 w-3" /> Width
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const currentAlt = editor.getAttributes('image').alt;
                                const alt = window.prompt('Alt text:', currentAlt || '');
                                if (alt !== null) {
                                    editor.chain().focus().updateAttributes('image', { alt, title: alt }).run();
                                }
                            }}
                            className="px-2 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs gap-1"
                            title="Edit Alt Text"
                        >
                            <Type className="h-3 w-3" /> Alt
                        </Button>
                    </>
                )}
            </div>

            <div className="flex items-center gap-1">
                {isHtmlMode && onFormat && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); onFormat(); }}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"></path></svg>
                        Format
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.preventDefault(); onToggleMode(); }}
                    className={isHtmlMode ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"}
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    {isHtmlMode ? "View Visual" : "View Source"}
                </Button>
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
        return v.startsWith('<!doctype') || v.startsWith('<html') || v.includes('<body') || (v.includes('<table') && v.includes('width="100%"'));
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
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { theme, systemTheme } = useTheme();

    // Write HTML into iframe for visual preview of complex templates
    const iframeWriting = useRef(false);
    useEffect(() => {
        if (!isHtmlMode && isComplexHtml(value) && iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                iframeWriting.current = true;
                doc.open();
                doc.write(value);
                doc.close();

                // Make the body editable
                if (doc.body) {
                    doc.body.contentEditable = 'true';
                    doc.body.style.outline = 'none';

                    // Sync edits back to parent
                    doc.body.addEventListener('input', () => {
                        if (!iframeWriting.current) {
                            // Reconstruct the full HTML including doctype/html/head
                            const doctype = doc.doctype
                                ? `<!DOCTYPE ${doc.doctype.name}>\n`
                                : '';
                            const fullHtml = doctype + doc.documentElement.outerHTML;
                            lastSelfValue.current = fullHtml;
                            onChangeRef.current(fullHtml);
                        }
                    });
                }
                // Allow the input listener to fire after initial write
                requestAnimationFrame(() => {
                    iframeWriting.current = false;
                });
            }
        }
    }, [value, isHtmlMode, isComplexHtml]);

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
                transformPastedText: true,
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

    // Upload handler for drag-drop and paste
    const handleDropOrPasteUpload = useCallback(async (file: File) => {
        if (!editor) return;

        setDropUploading(true);
        try {
            const result = await uploadImageFile(file);
            if ('error' in result) {
                alert(result.error);
                return;
            }

            const alt = file.name.replace(/\.[^/.]+$/, '');
            editor.chain().focus().setImage({
                src: result.url,
                alt,
                title: alt,
            }).run();
        } catch (error) {
            console.error('Error uploading dropped/pasted image:', error);
            alert('Failed to upload image.');
        } finally {
            setDropUploading(false);
        }
    }, [editor]);

    const handleToggleMode = () => {
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
            <Toolbar editor={editor} isHtmlMode={isHtmlMode} onToggleMode={handleToggleMode} onFormat={handleFormat} onOpenMediaPicker={() => setMediaPickerOpen(true)} />

            {/* HTML Source View */}
            <div className={!isHtmlMode ? "hidden" : "block"}>
                <div className="w-full bg-white dark:bg-zinc-900 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md overflow-hidden font-mono text-sm">
                    <CodeMirror
                        value={value}
                        height="600px"
                        extensions={[html()]}
                        onChange={(val) => { lastSelfValue.current = val; onChange(val); }}
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

            {/* Media Picker Modal */}
            <MediaPicker
                open={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                onSelect={(url, filename) => {
                    if (!editor) return;
                    const alt = window.prompt(
                        'Image alt text (optional, recommended for accessibility):',
                        filename.replace(/^\d+-\d+-/, '').replace(/\.[^/.]+$/, '')
                    );
                    editor.chain().focus().setImage({
                        src: url,
                        alt: alt || '',
                        title: alt || '',
                    }).run();
                    setMediaPickerOpen(false);
                }}
            />
        </div>
    );
}
