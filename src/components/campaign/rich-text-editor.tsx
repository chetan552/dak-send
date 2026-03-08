"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
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
    Image as ImageIcon, Loader2
} from "lucide-react";
import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Extension } from '@tiptap/core';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { useTheme } from 'next-themes';

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

// Define the toolbar buttons configuration
interface ToolbarProps {
    editor: any;
    isHtmlMode: boolean;
    onToggleMode: () => void;
    onFormat?: () => void;
}

const Toolbar = ({ editor, isHtmlMode, onToggleMode, onFormat }: ToolbarProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            editor.chain().focus().setImage({ src: data.url }).run();
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2 flex flex-wrap gap-1 rounded-t-md items-center justify-between sticky top-0 z-10">
            <div className="flex flex-wrap gap-1 items-center">
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

                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={isHtmlMode || !editor || uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                    title="Upload Image"
                >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
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
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const { theme, systemTheme } = useTheme();

    const editor = useEditor({
        extensions: [
            GlobalAttributes,
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Underline,
            TextStyle,
            Color,
            Image.configure({
                inline: true,
                allowBase64: true,
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
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[600px] p-6 bg-white text-black border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md',
            },
        },
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    const handleToggleMode = () => {
        setIsHtmlMode(!isHtmlMode);
        // Ensure switching views updates content completely
        if (editor) {
            if (isHtmlMode) {
                // Switching FROM source TO visual
                // We bypass tiptap-markdown by using ProseMirror's DOMParser directly
                const el = document.createElement('div');
                el.innerHTML = value;
                const newDoc = DOMParser.fromSchema(editor.schema).parse(el);

                // Replace the entire document content
                const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, newDoc.content);
                editor.view.dispatch(tr);
            } else {
                // Switching FROM visual TO source
                editor.commands.setContent(value);
            }
        }
    };



    const handleFormat = () => {
        onChange(prettyFormatHtml(value));
    };

    return (
        <div className="w-full relative shadow-sm">
            <Toolbar editor={editor} isHtmlMode={isHtmlMode} onToggleMode={handleToggleMode} onFormat={handleFormat} />

            {/* HTML Source View */}
            <div className={!isHtmlMode ? "hidden" : "block"}>
                <div className="w-full bg-white dark:bg-zinc-900 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md overflow-hidden font-mono text-sm">
                    <CodeMirror
                        value={value}
                        height="600px"
                        extensions={[html()]}
                        onChange={(val) => onChange(val)}
                        theme={theme === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : (theme === 'dark' ? 'dark' : 'light')}
                        className="text-sm"
                    />
                </div>
            </div>

            {/* Visual View */}
            <div className={isHtmlMode ? "hidden" : "block"}>
                <div className="flex-1 overflow-auto bg-white dark:bg-zinc-950 border border-t-0 border-zinc-200 dark:border-zinc-800 rounded-b-md p-6">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
