"use client";

import { useRef, useEffect, useState } from "react";

interface TemplatePreviewProps {
    html: string;
    height?: number;
}

// Returns true if the computed background colour is white / transparent / near-white
function isWhiteBg(color: string): boolean {
    if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return true;
    // rgb(r,g,b) or rgba(r,g,b,a)
    const m = color.match(/[\d.]+/g);
    if (!m) return true;
    const [r, g, b, a = 1] = m.map(Number);
    if (a < 0.05) return true;            // nearly transparent
    return r > 240 && g > 240 && b > 240; // near-white
}

export function TemplatePreview({ html, height = 200 }: TemplatePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [topOffset, setTopOffset] = useState(0);

    // Never scale up beyond 1× — only scale down to fit the card
    const scale = Math.min(1, height / 400);
    const innerWidth = Math.round(600 * scale);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        setTopOffset(0);
        setLoaded(false);

        doc.open();
        doc.write(`<!DOCTYPE html>
<html><head><style>
body { margin: 0 !important; padding: 0 !important; overflow: hidden; pointer-events: none; }
</style></head><body>${html}</body></html>`);
        doc.close();

        // Give the browser a frame to finish layout, then scan for top whitespace
        requestAnimationFrame(() => {
            try {
                const win = doc.defaultView;
                if (!win) return;

                // Scan every 2px from y=0 downward (up to 120px) using elementFromPoint.
                // Stop at the first row whose computed background is NOT white/transparent.
                let offset = 0;
                const maxScan = 120;
                const xProbe = 300; // horizontal centre of the 600px email

                for (let y = 0; y <= maxScan; y += 2) {
                    const el = doc.elementFromPoint(xProbe, y) as HTMLElement | null;
                    if (!el || el === doc.documentElement || el === doc.body) continue;

                    const bg = win.getComputedStyle(el).backgroundColor;
                    if (!isWhiteBg(bg)) {
                        offset = y;
                        break;
                    }
                }

                setTopOffset(offset);
            } catch {
                // sandbox restriction — ignore
            }
            setLoaded(true);
        });
    }, [html]);

    return (
        <div
            className="overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex justify-center"
            style={{ height }}
        >
            <div
                className="relative overflow-hidden flex-shrink-0"
                style={{ width: innerWidth, height }}
            >
                <iframe
                    ref={iframeRef}
                    className="absolute left-0 border-0 pointer-events-none"
                    style={{
                        top: -topOffset,
                        width: 600,
                        height: Math.round(height / scale) + topOffset,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                    }}
                    title="Template preview"
                    sandbox="allow-same-origin"
                />
                {!loaded && (
                    <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                )}
            </div>
        </div>
    );
}
