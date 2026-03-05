"use client";

import { useRef, useEffect, useState } from "react";

interface TemplatePreviewProps {
    html: string;
    height?: number;
}

export function TemplatePreview({ html, height = 200 }: TemplatePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        doc.open();
        doc.write(`<!DOCTYPE html>
<html><head><style>
body { margin: 0; transform-origin: top left; overflow: hidden; pointer-events: none; }
</style></head><body>${html}</body></html>`);
        doc.close();
        setLoaded(true);
    }, [html]);

    return (
        <div
            className="relative overflow-hidden rounded-md bg-white"
            style={{ height }}
        >
            <iframe
                ref={iframeRef}
                className="w-[600px] h-[800px] border-0 pointer-events-none"
                style={{
                    transform: `scale(${height / 400})`,
                    transformOrigin: "top left",
                }}
                title="Template preview"
                sandbox="allow-same-origin"
            />
            {!loaded && (
                <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            )}
        </div>
    );
}
