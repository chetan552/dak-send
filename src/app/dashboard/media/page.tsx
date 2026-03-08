"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Loader2, Trash2, Copy, Check, ImageIcon, Upload, Search, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface UploadedImage {
    filename: string;
    url: string;
    size: number;
    createdAt: string;
    modifiedAt: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

export default function MediaLibraryPage() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [uploading, setUploading] = useState(false);

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
        fetchImages();
    }, [fetchImages]);

    const handleDelete = async (filename: string) => {
        if (!confirm(`Delete "${filename}"? This cannot be undone. If this image is used in any campaigns, it will appear broken.`)) {
            return;
        }

        setDeleting(filename);
        try {
            const res = await fetch(`/api/uploads?filename=${encodeURIComponent(filename)}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setImages(prev => prev.filter(img => img.filename !== filename));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete image');
            }
        } catch {
            alert('Failed to delete image');
        } finally {
            setDeleting(null);
        }
    };

    const handleCopyUrl = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(url);
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch {
            // Fallback
            window.prompt('Copy this URL:', url);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            await fetchImages();
        } catch {
            alert('Failed to upload image(s)');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const filtered = search
        ? images.filter(img => img.filename.toLowerCase().includes(search.toLowerCase()))
        : images;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1">Media Library</h1>
                    <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Manage images uploaded for your campaigns.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchImages()}
                        disabled={loading}
                        className="border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                            multiple
                            onChange={handleUpload}
                            className="hidden"
                        />
                        <Button
                            asChild
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] cursor-pointer"
                            disabled={uploading}
                        >
                            <span>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload Images
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            {/* Search */}
            {images.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                        placeholder="Search images..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
            )}

            {/* Empty state */}
            {!loading && images.length === 0 && (
                <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                    <CardContent className="flex flex-col items-center justify-center p-16 text-center animate-in fade-in duration-700">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                            <ImageIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No images uploaded</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">Upload images to use in your email campaigns. You can also upload directly from the campaign editor.</p>
                    </CardContent>
                </Card>
            )}

            {/* No search results */}
            {!loading && images.length > 0 && filtered.length === 0 && (
                <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">No images match &quot;{search}&quot;</p>
            )}

            {/* Image grid */}
            {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filtered.map((img, i) => (
                        <Card
                            key={img.filename}
                            className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm hover:shadow-md group overflow-hidden animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${Math.min(i * 50, 500)}ms`, animationFillMode: "both" }}
                        >
                            <div className="aspect-square bg-zinc-100 dark:bg-zinc-800/50 relative overflow-hidden">
                                <img
                                    src={img.url}
                                    alt={img.filename}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleCopyUrl(img.url)}
                                        className="h-8 px-2 bg-white/90 text-zinc-800 hover:bg-white shadow-sm"
                                        title="Copy URL"
                                    >
                                        {copiedUrl === img.url ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleDelete(img.filename)}
                                        disabled={deleting === img.filename}
                                        className="h-8 px-2 bg-red-500/90 text-white hover:bg-red-600 shadow-sm"
                                        title="Delete"
                                    >
                                        {deleting === img.filename ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-3">
                                <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate font-medium" title={img.filename}>
                                    {img.filename.replace(/^\d+-\d+-/, '')}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-zinc-400">{formatFileSize(img.size)}</span>
                                    <span className="text-[10px] text-zinc-400">{formatDate(img.createdAt)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Stats bar */}
            {!loading && images.length > 0 && (
                <div className="text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    {images.length} image{images.length !== 1 ? 's' : ''} · {formatFileSize(images.reduce((sum, img) => sum + img.size, 0))} total
                </div>
            )}
        </div>
    );
}
