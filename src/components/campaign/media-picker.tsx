"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Loader2, X, Upload, Search, ImageIcon, Check, Link as LinkIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface UploadedImage {
    filename: string;
    url: string;
    size: number;
    createdAt: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ImageInsertMeta {
    alt?: string;
    width?: string;
    height?: string;
}

interface MediaPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (url: string, filename: string, meta: ImageInsertMeta) => void;
}

type Tab = 'library' | 'url';

function deriveDefaultAlt(filename: string): string {
    return filename.replace(/^\d+-\d+-/, '').replace(/\.[^/.]+$/, '');
}

export function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
    const [tab, setTab] = useState<Tab>('library');

    // --- Library tab state ---
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- URL tab state ---
    const [urlInput, setUrlInput] = useState("");
    const [urlPreviewOk, setUrlPreviewOk] = useState<boolean | null>(null);

    // --- Image attribute inputs (shared across tabs) ---
    const [altText, setAltText] = useState("");
    const [widthInput, setWidthInput] = useState("");
    const [heightInput, setHeightInput] = useState("");

    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/uploads');
            const data = await res.json();
            setImages(data.images || []);
        } catch (error) {
            console.error('Failed to load images:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchImages();
            setSelected(null);
            setSearch("");
            setTab('library');
            setUrlInput("");
            setUrlPreviewOk(null);
            setAltText("");
            setWidthInput("");
            setHeightInput("");
        }
    }, [open, fetchImages]);

    // Pre-fill alt text from filename when the user selects a library image
    useEffect(() => {
        if (!selected) return;
        const img = images.find(i => i.url === selected);
        if (img && !altText.trim()) {
            setAltText(deriveDefaultAlt(img.filename));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    alert(data.error || 'Failed to upload');
                    continue;
                }
            }
            await fetchImages();
        } catch {
            alert('Failed to upload image(s)');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const buildMeta = (fallbackAlt: string): ImageInsertMeta => ({
        alt: altText.trim() || fallbackAlt,
        width: widthInput.trim() || undefined,
        height: heightInput.trim() || undefined,
    });

    const handleInsertFromLibrary = () => {
        if (!selected) return;
        const img = images.find(i => i.url === selected);
        if (img) onSelect(img.url, img.filename, buildMeta(deriveDefaultAlt(img.filename)));
    };

    const handleInsertFromUrl = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        // derive a simple filename from the URL
        const filename = trimmed.split('/').pop()?.split('?')[0] || 'image';
        onSelect(trimmed, filename, buildMeta(deriveDefaultAlt(filename)));
    };

    const filtered = search
        ? images.filter(img => img.filename.toLowerCase().includes(search.toLowerCase()))
        : images;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" /> Insert Image
                    </h2>
                    <div className="flex items-center gap-2">
                        {tab === 'library' && (
                            <>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleUpload}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 gap-2"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    Upload New
                                </Button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                    {([['library', <ImageIcon key="l" className="w-4 h-4" />, 'Media Library'] as const,
                       ['url', <LinkIcon key="u" className="w-4 h-4" />, 'From URL'] as const]).map(([id, icon, label]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                tab === id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {/* --- LIBRARY TAB --- */}
                {tab === 'library' && (
                    <>
                        {/* Search */}
                        <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/50">
                            <div className="relative max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    placeholder="Search images..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
                                />
                            </div>
                        </div>

                        {/* Image grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                                </div>
                            ) : images.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-3">
                                        <ImageIcon className="w-7 h-7 text-zinc-400" />
                                    </div>
                                    <p className="text-zinc-500 dark:text-zinc-400 mb-2">No images uploaded yet.</p>
                                    <p className="text-zinc-400 dark:text-zinc-500 text-sm mb-4">Use &ldquo;Upload New&rdquo; above, or try the &ldquo;From URL&rdquo; tab.</p>
                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                                        <Upload className="w-4 h-4" /> Upload Image
                                    </Button>
                                </div>
                            ) : filtered.length === 0 ? (
                                <p className="text-center text-zinc-500 py-12">No images match &quot;{search}&quot;</p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {filtered.map((img) => {
                                        const isSelected = selected === img.url;
                                        return (
                                            <button
                                                key={img.filename}
                                                type="button"
                                                onClick={() => setSelected(isSelected ? null : img.url)}
                                                className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                    isSelected
                                                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                }`}
                                            >
                                                <img src={img.url} alt={img.filename} className="w-full h-full object-cover" loading="lazy" />
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[10px] text-white truncate">{img.filename.replace(/^\d+-\d+-/, '')}</p>
                                                    <p className="text-[9px] text-white/70">{formatFileSize(img.size)}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <AttrFieldsRow
                            alt={altText} setAlt={setAltText}
                            width={widthInput} setWidth={setWidthInput}
                            height={heightInput} setHeight={setHeightInput}
                        />

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl">
                            <span className="text-xs text-zinc-400">{images.length} image{images.length !== 1 ? 's' : ''} available</span>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!selected}
                                    onClick={handleInsertFromLibrary}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                >
                                    <ImageIcon className="w-4 h-4" /> Insert Image
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* --- URL TAB --- */}
                {tab === 'url' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-lg mx-auto space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        Public image URL
                                    </label>
                                    <Input
                                        type="url"
                                        placeholder="https://example.com/image.png"
                                        value={urlInput}
                                        onChange={(e) => {
                                            setUrlInput(e.target.value);
                                            setUrlPreviewOk(null);
                                        }}
                                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                        autoFocus
                                    />
                                    <p className="mt-1.5 text-xs text-zinc-400">Paste the URL of any publicly accessible image (JPEG, PNG, GIF, WebP, SVG).</p>
                                </div>

                                {/* Preview */}
                                {urlInput.trim() && (
                                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 p-3">
                                        <p className="text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
                                        <div className="flex items-center justify-center min-h-[120px]">
                                            <img
                                                key={urlInput}
                                                src={urlInput.trim()}
                                                alt="Preview"
                                                className="max-h-48 max-w-full object-contain rounded"
                                                onLoad={() => setUrlPreviewOk(true)}
                                                onError={() => setUrlPreviewOk(false)}
                                            />
                                        </div>
                                        {urlPreviewOk === false && (
                                            <p className="text-xs text-red-500 mt-2 text-center">⚠ Could not load image. Make sure the URL is correct and publicly accessible.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <AttrFieldsRow
                            alt={altText} setAlt={setAltText}
                            width={widthInput} setWidth={setWidthInput}
                            height={heightInput} setHeight={setHeightInput}
                        />

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-b-xl">
                            <span className="text-xs text-zinc-400">The image must be publicly accessible for it to display in emails.</span>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!urlInput.trim() || urlPreviewOk === false}
                                    onClick={handleInsertFromUrl}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                >
                                    <ImageIcon className="w-4 h-4" /> Insert Image
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

interface AttrFieldsRowProps {
    alt: string; setAlt: (v: string) => void;
    width: string; setWidth: (v: string) => void;
    height: string; setHeight: (v: string) => void;
}

export function AttrFieldsRow({ alt, setAlt, width, setWidth, height, setHeight }: AttrFieldsRowProps) {
    return (
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="grid grid-cols-[1fr_110px_110px] gap-3 items-end">
                <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">Alt text</label>
                    <Input
                        type="text"
                        placeholder="Describe the image"
                        value={alt}
                        onChange={(e) => setAlt(e.target.value)}
                        className="h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">Width</label>
                    <Input
                        type="text"
                        placeholder="e.g. 300"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">Height</label>
                    <Input
                        type="text"
                        placeholder="e.g. auto"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm"
                    />
                </div>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">Size accepts pixels (<code>300</code>), percent (<code>50%</code>), or <code>auto</code>. Leave blank for the image&apos;s natural size.</p>
        </div>
    );
}
