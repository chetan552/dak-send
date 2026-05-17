"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Type,
    Heading,
    ImageIcon,
    MousePointerClick,
    Minus,
    Space,
    Columns2,
    Code2,
    GripVertical,
    Trash2,
    Plus,
    Copy,
    Settings2,
    Eye,
    EyeOff,
    Loader2,
    ChevronDown,
    ChevronUp,
    Undo2,
    Redo2,
} from "lucide-react";
import {
    type EmailBlock,
    type BlockEmailDocument,
    type TextBlock,
    type HeadingBlock,
    type ImageBlock,
    type ButtonBlock,
    type DividerBlock,
    type SpacerBlock,
    type ColumnsBlock,
    type HtmlBlock,
    compileBlocksToHtml,
    createDefaultDocument,
} from "@/lib/blocks-to-html";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BlockWithId = EmailBlock & { id: string };

// ---------------------------------------------------------------------------
// Block palette items
// ---------------------------------------------------------------------------

const BLOCK_TYPES: {
    type: EmailBlock["type"];
    icon: React.ReactNode;
    label: string;
    description: string;
    defaultProps: () => Record<string, any>;
}[] = [
    {
        type: "text",
        icon: <Type className="w-5 h-5" />,
        label: "Text",
        description: "Paragraph of text",
        defaultProps: () => ({
            content: "<p>Write your content here. Use <strong>bold</strong> or <em>italic</em> for emphasis.</p>",
            align: "left",
        }),
    },
    {
        type: "heading",
        icon: <Heading className="w-5 h-5" />,
        label: "Heading",
        description: "Section heading",
        defaultProps: () => ({ content: "Your Heading", level: 2, align: "left" }),
    },
    {
        type: "image",
        icon: <ImageIcon className="w-5 h-5" />,
        label: "Image",
        description: "Image with optional link",
        defaultProps: () => ({ src: "", alt: "", align: "center", href: "" }),
    },
    {
        type: "button",
        icon: <MousePointerClick className="w-5 h-5" />,
        label: "Button",
        description: "Call-to-action button",
        defaultProps: () => ({ text: "Click Here", href: "https://", align: "center", bgColor: "#4f46e5", textColor: "#ffffff" }),
    },
    {
        type: "divider",
        icon: <Minus className="w-5 h-5" />,
        label: "Divider",
        description: "Horizontal rule",
        defaultProps: () => ({ color: "#e5e7eb", thickness: 1 }),
    },
    {
        type: "spacer",
        icon: <Space className="w-5 h-5" />,
        label: "Spacer",
        description: "Vertical space",
        defaultProps: () => ({ height: 32 }),
    },
    {
        type: "columns",
        icon: <Columns2 className="w-5 h-5" />,
        label: "Two Columns",
        description: "Side-by-side columns",
        defaultProps: () => ({
            columns: [
                { blocks: [{ id: crypto.randomUUID(), type: "text", props: { content: "<p>Left column</p>" } }] },
                { blocks: [{ id: crypto.randomUUID(), type: "text", props: { content: "<p>Right column</p>" } }] },
            ],
            gap: 16,
        }),
    },
    {
        type: "html",
        icon: <Code2 className="w-5 h-5" />,
        label: "HTML",
        description: "Raw HTML block",
        defaultProps: () => ({ html: "<p>Custom HTML here</p>" }),
    },
];

// ---------------------------------------------------------------------------
// Individual block renderer (preview)
// ---------------------------------------------------------------------------

function BlockPreview({ block }: { block: BlockWithId }) {
    switch (block.type) {
        case "text": {
            const p = (block as TextBlock).props;
            return (
                <div
                    className="text-sm"
                    style={{ textAlign: p.align as any, color: p.color || "#333", fontSize: p.fontSize ? `${p.fontSize}px` : undefined }}
                    dangerouslySetInnerHTML={{ __html: p.content || "<em style='color:#999'>Empty text block</em>" }}
                />
            );
        }
        case "heading": {
            const p = (block as HeadingBlock).props;
            const sizes: Record<number, string> = { 1: "text-3xl", 2: "text-2xl", 3: "text-xl" };
            const sz = sizes[p.level || 2];
            return (
                <div
                    className={`${sz} font-bold leading-tight`}
                    style={{ textAlign: p.align as any, color: p.color || "#111" }}
                    dangerouslySetInnerHTML={{ __html: p.content || "<em style='color:#999'>Empty heading</em>" }}
                />
            );
        }
        case "image": {
            const p = (block as ImageBlock).props;
            if (!p.src) {
                return (
                    <div
                        className="flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded border-2 border-dashed border-zinc-300 dark:border-zinc-600 h-24"
                        style={{ textAlign: p.align as any }}
                    >
                        <div className="text-center text-zinc-400 text-sm">
                            <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                            No image URL set
                        </div>
                    </div>
                );
            }
            return (
                <div style={{ textAlign: p.align as any }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={p.src}
                        alt={p.alt || ""}
                        style={{ maxWidth: "100%", borderRadius: p.rounded ? "8px" : undefined, width: p.width ? `${p.width}px` : undefined }}
                    />
                </div>
            );
        }
        case "button": {
            const p = (block as ButtonBlock).props;
            return (
                <div style={{ textAlign: p.align as any }}>
                    <span
                        className="inline-block text-sm font-bold rounded cursor-default"
                        style={{
                            backgroundColor: p.bgColor || "#4f46e5",
                            color: p.textColor || "#fff",
                            padding: p.padding || "14px 28px",
                            borderRadius: `${p.borderRadius ?? 6}px`,
                        }}
                    >
                        {p.text || "Button"}
                    </span>
                </div>
            );
        }
        case "divider":
            return <hr className="border-0" style={{ borderTop: `${(block as DividerBlock).props.thickness || 1}px solid ${(block as DividerBlock).props.color || "#e5e7eb"}` }} />;
        case "spacer":
            return (
                <div
                    className="flex items-center justify-center"
                    style={{ height: `${(block as SpacerBlock).props.height || 24}px`, borderTop: "1px dashed #d1d5db", borderBottom: "1px dashed #d1d5db" }}
                >
                    <span className="text-xs text-zinc-400">Spacer {(block as SpacerBlock).props.height || 24}px</span>
                </div>
            );
        case "columns": {
            const p = (block as ColumnsBlock).props;
            return (
                <div className="flex gap-2">
                    {p.columns.map((col, i) => (
                        <div key={i} className="flex-1 border border-dashed border-zinc-300 dark:border-zinc-600 rounded p-2 min-h-12">
                            {col.blocks.map((b: any) => (
                                <div key={b.id} className="mb-1">
                                    <BlockPreview block={b} />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            );
        }
        case "html":
            return (
                <div
                    className="text-sm font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded p-2 border border-zinc-200 dark:border-zinc-700 max-h-20 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: (block as HtmlBlock).props.html || "<em>Empty HTML block</em>" }}
                />
            );
        default:
            return <div className="text-sm text-zinc-400">Unknown block</div>;
    }
}

// ---------------------------------------------------------------------------
// Block properties panel
// ---------------------------------------------------------------------------

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-zinc-500 dark:text-zinc-400">{label}</Label>
            {children}
        </div>
    );
}

function AlignSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
    return (
        <div className="flex gap-1">
            {(["left", "center", "right"] as const).map(a => (
                <button
                    key={a}
                    type="button"
                    onClick={() => onChange(a)}
                    className={cn(
                        "flex-1 py-1 text-xs rounded border transition-colors",
                        value === a
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
            ))}
        </div>
    );
}

function BlockPropsPanel({
    block,
    onChange,
}: {
    block: BlockWithId;
    onChange: (updated: BlockWithId) => void;
}) {
    const update = (props: Record<string, any>) => {
        onChange({ ...block, props: { ...block.props, ...props } } as BlockWithId);
    };

    switch (block.type) {
        case "text": {
            const p = (block as TextBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Alignment">
                        <AlignSelect value={p.align} onChange={v => update({ align: v })} />
                    </PropRow>
                    <PropRow label="Content (HTML)">
                        <textarea
                            value={p.content}
                            onChange={e => update({ content: e.target.value })}
                            className="w-full min-h-[120px] text-xs font-mono border rounded p-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white resize-y"
                        />
                    </PropRow>
                    <PropRow label="Font Size (px)">
                        <Input
                            type="number"
                            value={p.fontSize || 16}
                            onChange={e => update({ fontSize: parseInt(e.target.value) || 16 })}
                            className="h-8 text-sm"
                        />
                    </PropRow>
                    <PropRow label="Text Color">
                        <div className="flex gap-2 items-center">
                            <input type="color" value={p.color || "#333333"} onChange={e => update({ color: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                            <Input value={p.color || "#333333"} onChange={e => update({ color: e.target.value })} className="h-8 text-sm flex-1" />
                        </div>
                    </PropRow>
                    <PropRow label="Padding (CSS)">
                        <Input value={p.padding || "8px 24px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" placeholder="8px 24px" />
                    </PropRow>
                </div>
            );
        }
        case "heading": {
            const p = (block as HeadingBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Content">
                        <Input value={p.content} onChange={e => update({ content: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                    <PropRow label="Level">
                        <div className="flex gap-1">
                            {([1, 2, 3] as const).map(l => (
                                <button key={l} type="button" onClick={() => update({ level: l })}
                                    className={cn("flex-1 py-1 text-xs font-bold rounded border transition-colors",
                                        p.level === l ? "bg-indigo-600 text-white border-indigo-600" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    )}>H{l}</button>
                            ))}
                        </div>
                    </PropRow>
                    <PropRow label="Alignment">
                        <AlignSelect value={p.align} onChange={v => update({ align: v })} />
                    </PropRow>
                    <PropRow label="Text Color">
                        <div className="flex gap-2 items-center">
                            <input type="color" value={p.color || "#111111"} onChange={e => update({ color: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                            <Input value={p.color || "#111111"} onChange={e => update({ color: e.target.value })} className="h-8 text-sm flex-1" />
                        </div>
                    </PropRow>
                    <PropRow label="Padding (CSS)">
                        <Input value={p.padding || "16px 24px 8px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                </div>
            );
        }
        case "image": {
            const p = (block as ImageBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Image URL">
                        <Input value={p.src} onChange={e => update({ src: e.target.value })} className="h-8 text-sm" placeholder="https://..." />
                    </PropRow>
                    <PropRow label="Alt Text">
                        <Input value={p.alt || ""} onChange={e => update({ alt: e.target.value })} className="h-8 text-sm" placeholder="Describe the image" />
                    </PropRow>
                    <PropRow label="Link URL (optional)">
                        <Input value={p.href || ""} onChange={e => update({ href: e.target.value })} className="h-8 text-sm" placeholder="https://..." />
                    </PropRow>
                    <PropRow label="Alignment">
                        <AlignSelect value={p.align} onChange={v => update({ align: v })} />
                    </PropRow>
                    <PropRow label="Width (px, optional)">
                        <Input type="number" value={p.width || ""} onChange={e => update({ width: parseInt(e.target.value) || undefined })} className="h-8 text-sm" placeholder="600" />
                    </PropRow>
                    <PropRow label="Padding (CSS)">
                        <Input value={p.padding || "16px 24px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                    <div className="flex items-center gap-2">
                        <input id="img-rounded" type="checkbox" checked={!!p.rounded} onChange={e => update({ rounded: e.target.checked })} className="rounded" />
                        <Label htmlFor="img-rounded" className="text-sm cursor-pointer">Rounded corners</Label>
                    </div>
                </div>
            );
        }
        case "button": {
            const p = (block as ButtonBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Button Text">
                        <Input value={p.text} onChange={e => update({ text: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                    <PropRow label="Link URL">
                        <Input value={p.href} onChange={e => update({ href: e.target.value })} className="h-8 text-sm" placeholder="https://..." />
                    </PropRow>
                    <PropRow label="Alignment">
                        <AlignSelect value={p.align} onChange={v => update({ align: v })} />
                    </PropRow>
                    <PropRow label="Background Color">
                        <div className="flex gap-2 items-center">
                            <input type="color" value={p.bgColor || "#4f46e5"} onChange={e => update({ bgColor: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                            <Input value={p.bgColor || "#4f46e5"} onChange={e => update({ bgColor: e.target.value })} className="h-8 text-sm flex-1" />
                        </div>
                    </PropRow>
                    <PropRow label="Text Color">
                        <div className="flex gap-2 items-center">
                            <input type="color" value={p.textColor || "#ffffff"} onChange={e => update({ textColor: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                            <Input value={p.textColor || "#ffffff"} onChange={e => update({ textColor: e.target.value })} className="h-8 text-sm flex-1" />
                        </div>
                    </PropRow>
                    <PropRow label="Border Radius (px)">
                        <Input type="number" value={p.borderRadius ?? 6} onChange={e => update({ borderRadius: parseInt(e.target.value) || 0 })} className="h-8 text-sm" />
                    </PropRow>
                    <PropRow label="Font Size (px)">
                        <Input type="number" value={p.fontSize || 16} onChange={e => update({ fontSize: parseInt(e.target.value) || 16 })} className="h-8 text-sm" />
                    </PropRow>
                    <PropRow label="Button Padding">
                        <Input value={p.padding || "14px 28px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" placeholder="14px 28px" />
                    </PropRow>
                </div>
            );
        }
        case "divider": {
            const p = (block as DividerBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Color">
                        <div className="flex gap-2 items-center">
                            <input type="color" value={p.color || "#e5e7eb"} onChange={e => update({ color: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                            <Input value={p.color || "#e5e7eb"} onChange={e => update({ color: e.target.value })} className="h-8 text-sm flex-1" />
                        </div>
                    </PropRow>
                    <PropRow label="Thickness (px)">
                        <Input type="number" value={p.thickness || 1} onChange={e => update({ thickness: parseInt(e.target.value) || 1 })} className="h-8 text-sm" />
                    </PropRow>
                    <PropRow label="Padding (CSS)">
                        <Input value={p.padding || "8px 24px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                </div>
            );
        }
        case "spacer": {
            const p = (block as SpacerBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Height (px)">
                        <Input type="number" value={p.height || 32} onChange={e => update({ height: parseInt(e.target.value) || 32 })} className="h-8 text-sm" />
                    </PropRow>
                </div>
            );
        }
        case "columns": {
            const p = (block as ColumnsBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="Column Gap (px)">
                        <Input type="number" value={p.gap || 16} onChange={e => update({ gap: parseInt(e.target.value) || 0 })} className="h-8 text-sm" />
                    </PropRow>
                    <PropRow label="Padding (CSS)">
                        <Input value={p.padding || "8px 24px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                    <p className="text-xs text-zinc-400 mt-1">To edit column content, use the HTML view or edit the raw JSON. Full nested block editing coming soon.</p>
                </div>
            );
        }
        case "html": {
            const p = (block as HtmlBlock).props;
            return (
                <div className="space-y-3 p-4">
                    <PropRow label="HTML Content">
                        <textarea
                            value={p.html}
                            onChange={e => update({ html: e.target.value })}
                            className="w-full min-h-[160px] text-xs font-mono border rounded p-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white resize-y"
                        />
                    </PropRow>
                    <PropRow label="Padding (CSS)">
                        <Input value={p.padding || "0 24px"} onChange={e => update({ padding: e.target.value })} className="h-8 text-sm" />
                    </PropRow>
                </div>
            );
        }
        default:
            return <div className="p-4 text-sm text-zinc-400">No properties available.</div>;
    }
}

// ---------------------------------------------------------------------------
// Document settings panel
// ---------------------------------------------------------------------------

function DocumentSettingsPanel({
    settings,
    onChange,
}: {
    settings: BlockEmailDocument["settings"];
    onChange: (s: BlockEmailDocument["settings"]) => void;
}) {
    const s = settings || {};
    const update = (patch: Partial<NonNullable<BlockEmailDocument["settings"]>>) =>
        onChange({ ...s, ...patch });

    return (
        <div className="space-y-3 p-4">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Email Settings</p>
            <PropRow label="Content Width (px)">
                <Input type="number" value={s.contentWidth || 600} onChange={e => update({ contentWidth: parseInt(e.target.value) || 600 })} className="h-8 text-sm" />
            </PropRow>
            <PropRow label="Background Color">
                <div className="flex gap-2 items-center">
                    <input type="color" value={s.backgroundColor || "#f4f4f5"} onChange={e => update({ backgroundColor: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                    <Input value={s.backgroundColor || "#f4f4f5"} onChange={e => update({ backgroundColor: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
            </PropRow>
            <PropRow label="Content Background">
                <div className="flex gap-2 items-center">
                    <input type="color" value={s.contentBackground || "#ffffff"} onChange={e => update({ contentBackground: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                    <Input value={s.contentBackground || "#ffffff"} onChange={e => update({ contentBackground: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
            </PropRow>
            <PropRow label="Default Text Color">
                <div className="flex gap-2 items-center">
                    <input type="color" value={s.textColor || "#333333"} onChange={e => update({ textColor: e.target.value })} className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                    <Input value={s.textColor || "#333333"} onChange={e => update({ textColor: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
            </PropRow>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sortable block card (canvas item)
// ---------------------------------------------------------------------------

function SortableBlockCard({
    block,
    isSelected,
    onSelect,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
}: {
    block: BlockWithId;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const blockMeta = BLOCK_TYPES.find(bt => bt.type === block.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={cn(
                "group relative border-2 rounded-lg transition-all cursor-pointer bg-white dark:bg-zinc-950",
                isSelected
                    ? "border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
        >
            {/* Block type label */}
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 border-b text-xs font-medium transition-colors",
                isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                    : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
            )}>
                {/* Drag handle */}
                <span
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">{blockMeta?.icon}</span>
                <span className="flex-1">{blockMeta?.label || block.type}</span>

                {/* Actions — shown on hover/select */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onMoveUp(); }}
                        disabled={isFirst}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30"
                        title="Move up"
                    >
                        <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onMoveDown(); }}
                        disabled={isLast}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30"
                        title="Move down"
                    >
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onDuplicate(); }}
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        title="Duplicate block"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        title="Delete block"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Block preview */}
            <div className="px-4 py-3 overflow-hidden">
                <BlockPreview block={block} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main BlockEditor
// ---------------------------------------------------------------------------

interface BlockEditorProps {
    campaignId: string;
    initialDoc?: BlockEmailDocument | null;
    onSave: (doc: BlockEmailDocument, compiledHtml: string) => Promise<void>;
}

export function BlockEditor({ campaignId, initialDoc, onSave }: BlockEditorProps) {
    const [doc, setDoc] = useState<BlockEmailDocument>(
        initialDoc && initialDoc.blocks?.length > 0 ? initialDoc : createDefaultDocument()
    );
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
        doc.blocks[0]?.id ?? null
    );
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [saving, setSaving] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // History for undo/redo
    const historyRef = useRef<BlockEmailDocument[]>([doc]);
    const historyIndexRef = useRef(0);

    const updateDoc = useCallback((newDoc: BlockEmailDocument) => {
        const idx = historyIndexRef.current;
        // Trim future history
        historyRef.current = historyRef.current.slice(0, idx + 1);
        historyRef.current.push(newDoc);
        historyIndexRef.current = historyRef.current.length - 1;
        setDoc(newDoc);
    }, []);

    const undo = useCallback(() => {
        if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
            setDoc(historyRef.current[historyIndexRef.current]);
        }
    }, []);

    const redo = useCallback(() => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current++;
            setDoc(historyRef.current[historyIndexRef.current]);
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over || active.id === over.id) return;
        const oldIdx = doc.blocks.findIndex(b => b.id === active.id);
        const newIdx = doc.blocks.findIndex(b => b.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return;
        updateDoc({ ...doc, blocks: arrayMove(doc.blocks as BlockWithId[], oldIdx, newIdx) });
    };

    const addBlock = (type: EmailBlock["type"]) => {
        const meta = BLOCK_TYPES.find(b => b.type === type)!;
        const newBlock = {
            id: crypto.randomUUID(),
            type,
            props: meta.defaultProps(),
        } as unknown as BlockWithId;

        let blocks: BlockWithId[];
        const selIdx = doc.blocks.findIndex(b => b.id === selectedBlockId);
        if (selIdx !== -1) {
            blocks = [...doc.blocks as BlockWithId[]];
            blocks.splice(selIdx + 1, 0, newBlock);
        } else {
            blocks = [...doc.blocks as BlockWithId[], newBlock];
        }
        updateDoc({ ...doc, blocks });
        setSelectedBlockId(newBlock.id);
    };

    const updateBlock = (updated: BlockWithId) => {
        updateDoc({
            ...doc,
            blocks: doc.blocks.map(b => b.id === updated.id ? updated : b) as BlockWithId[],
        });
    };

    const deleteBlock = (id: string) => {
        const blocks = (doc.blocks as BlockWithId[]).filter(b => b.id !== id);
        updateDoc({ ...doc, blocks });
        if (selectedBlockId === id) {
            setSelectedBlockId(blocks[0]?.id ?? null);
        }
    };

    const duplicateBlock = (id: string) => {
        const idx = doc.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        const original = doc.blocks[idx] as BlockWithId;
        const copy = { ...original, id: crypto.randomUUID(), props: { ...(original.props as any) } } as BlockWithId;
        const blocks = [...doc.blocks as BlockWithId[]];
        blocks.splice(idx + 1, 0, copy);
        updateDoc({ ...doc, blocks });
        setSelectedBlockId(copy.id);
    };

    const moveBlock = (id: string, direction: "up" | "down") => {
        const idx = doc.blocks.findIndex(b => b.id === id);
        if (idx === -1) return;
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= doc.blocks.length) return;
        updateDoc({ ...doc, blocks: arrayMove(doc.blocks as BlockWithId[], idx, newIdx) });
    };

    const handlePreview = () => {
        const html = compileBlocksToHtml(doc);
        setPreviewHtml(html);
        setShowPreview(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const compiledHtml = compileBlocksToHtml(doc);
            await onSave(doc, compiledHtml);
        } finally {
            setSaving(false);
        }
    };

    const selectedBlock = doc.blocks.find(b => b.id === selectedBlockId) as BlockWithId | undefined;
    const activeBlock = activeId ? (doc.blocks.find(b => b.id === activeId) as BlockWithId | undefined) : undefined;

    if (showPreview) {
        return (
            <div className="fixed inset-0 z-50 bg-zinc-900/80 flex flex-col">
                <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
                    <span className="text-white font-semibold">Email Preview</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(false)}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                        <EyeOff className="w-4 h-4 mr-2" /> Close Preview
                    </Button>
                </div>
                <div className="flex-1 overflow-auto bg-zinc-200 p-8 flex justify-center">
                    <iframe
                        srcDoc={previewHtml}
                        title="Email preview"
                        className="w-[640px] min-h-[800px] bg-white shadow-xl rounded"
                        sandbox="allow-same-origin"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Left sidebar — block palette */}
            <aside className="w-56 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col overflow-y-auto">
                <div className="px-4 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Blocks</p>
                    <p className="text-xs text-zinc-400">Click to add after selection</p>
                </div>
                <div className="p-2 space-y-1 flex-1">
                    {BLOCK_TYPES.map(bt => (
                        <button
                            key={bt.type}
                            type="button"
                            onClick={() => addBlock(bt.type)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-300 text-zinc-600 dark:text-zinc-300 group"
                        >
                            <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 transition-colors">{bt.icon}</span>
                            <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{bt.label}</div>
                                <div className="text-xs text-zinc-400 truncate">{bt.description}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Settings toggle at bottom */}
                <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={() => { setShowSettings(s => !s); setSelectedBlockId(null); }}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-zinc-600 dark:text-zinc-300",
                            showSettings ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                    >
                        <Settings2 className="w-5 h-5 text-zinc-400" />
                        <span className="text-sm font-medium">Email Settings</span>
                    </button>
                </div>
            </aside>

            {/* Center — canvas */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={undo} title="Undo (Ctrl+Z)" className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 disabled:opacity-30" disabled={historyIndexRef.current <= 0}>
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={redo} title="Redo" className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 disabled:opacity-30" disabled={historyIndexRef.current >= historyRef.current.length - 1}>
                            <Redo2 className="w-4 h-4" />
                        </button>
                        <span className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{doc.blocks.length} block{doc.blocks.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handlePreview} className="gap-1.5 border-zinc-200 dark:border-zinc-700">
                            <Eye className="w-4 h-4" /> Preview
                        </Button>
                        <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    </div>
                </div>

                {/* Block canvas */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl mx-auto space-y-2">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={doc.blocks.map(b => b.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {doc.blocks.map((block, idx) => (
                                    <SortableBlockCard
                                        key={block.id}
                                        block={block as BlockWithId}
                                        isSelected={selectedBlockId === block.id}
                                        onSelect={() => { setSelectedBlockId(block.id); setShowSettings(false); }}
                                        onDelete={() => deleteBlock(block.id)}
                                        onDuplicate={() => duplicateBlock(block.id)}
                                        onMoveUp={() => moveBlock(block.id, "up")}
                                        onMoveDown={() => moveBlock(block.id, "down")}
                                        isFirst={idx === 0}
                                        isLast={idx === doc.blocks.length - 1}
                                    />
                                ))}
                            </SortableContext>

                            <DragOverlay>
                                {activeBlock && (
                                    <div className="border-2 border-indigo-500 rounded-lg bg-white dark:bg-zinc-950 p-4 shadow-xl opacity-90">
                                        <BlockPreview block={activeBlock} />
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>

                        {/* Add block button */}
                        <button
                            type="button"
                            onClick={() => addBlock("text")}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">Add text block</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Right sidebar — properties */}
            <aside className="w-64 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col overflow-y-auto">
                {showSettings ? (
                    <DocumentSettingsPanel
                        settings={doc.settings}
                        onChange={settings => updateDoc({ ...doc, settings })}
                    />
                ) : selectedBlock ? (
                    <>
                        <div className="px-4 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                            <span className="text-zinc-400">{BLOCK_TYPES.find(b => b.type === selectedBlock.type)?.icon}</span>
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                                {BLOCK_TYPES.find(b => b.type === selectedBlock.type)?.label} Properties
                            </p>
                        </div>
                        <BlockPropsPanel block={selectedBlock} onChange={updateBlock} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
                        <Settings2 className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mb-3" />
                        <p className="text-sm text-zinc-400">Select a block to edit its properties</p>
                    </div>
                )}
            </aside>
        </div>
    );
}
